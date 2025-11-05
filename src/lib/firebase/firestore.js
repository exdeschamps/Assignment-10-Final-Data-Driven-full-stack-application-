
// import helper that generates fake albums and reviews
import { generateFakeAlbumsAndReviews } from "@/src/lib/fakeAlbums.js"; // dev helper

// import Firestore functions used in this module
import {
  collection,
  onSnapshot,
  query,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  Timestamp,
  runTransaction,
  where,
  addDoc,
  getFirestore,
} from "firebase/firestore"; // Firestore SDK helpers

// import the initialized client-side Firestore instance
import { db } from "@/src/lib/firebase/clientApp"; // preconfigured Firestore client

export async function updateAlbumImageReference(
  albumId,
  publicImageUrl
) {
  // create a document reference for the album
  const albumRef = doc(collection(db, "albums"), albumId);
  // if the reference exists, update the coverArt field
  if (albumRef) {
    await updateDoc(albumRef, { coverArt: publicImageUrl }); // write new cover art URL to album doc
  }
}

/**
 * Update aggregate rating fields on an album document inside a transaction.
 *
 * This helper will compute the new average rating and increment the
 * number-of-ratings based on the provided newRatingDocument. It expects the
 * album document to have `avgRating` and `numRatings` fields (numbers).
 *
 * @param {import('firebase/firestore').Transaction} transaction - Firestore transaction
 * @param {import('firebase/firestore').DocumentReference} docRef - Reference to album doc
 * @param {{rating: number}} newRatingDocument - The newly-added rating document data
 * @param {?object} review - The full review object being written (optional, unused)
 * @returns {Promise<void>}
 */
// helper to update album aggregates in a transaction
const updateWithRating = async (
  transaction,
  docRef,
  newRatingDocument,
  review
) => {
  // fetch the album document inside the transaction
  const album = await transaction.get(docRef); // get current album snapshot
  // compute new aggregate values
  const data = album.data(); // current album data
  // increment number of ratings and compute new average
  const newNumRatings = data?.numRatings ? data.numRatings + 1 : 1; // handle missing numRatings
  // compute new sum and average ratings
  const newSumRating = (data?.sumRating || 0) + Number(review.rating); // add new rating
  const newAverage = newSumRating / newNumRatings; // compute average

  transaction.update(docRef, {
    numRatings: newNumRatings,
    sumRating: newSumRating,
    avgRating: newAverage,
  }); // update album doc atomically

  transaction.set(newRatingDocument, {
    ...review,
    timestamp: Timestamp.fromDate(new Date()), // add server-style timestamp
  }); // write the new rating document inside transaction
};

/**
 * Add a review (rating) to an album and update the album aggregates.
 *
 * This function performs a transaction to add the new rating document under
 * `albums/{albumId}/ratings` and atomically updates the parent
 * album's `numRatings` and `avgRating` fields.
 *
 * @param {import('firebase/firestore').Firestore} firestoreDb - Firestore instance
 * @param {string} albumId - ID of the album to which the review belongs
 * @param {{rating: number, text?: string, user?: object}} review - Review data; must include `rating`
 * @returns {Promise<void>} Resolves when write completes
 */
// add a review to an album and update aggregates atomically
export async function addReviewToAlbum(db, albumId, review) {
  if (!albumId) {
    throw new Error("No album ID has been provided."); // ensure album id is present
  }
// validate review object
  if (!review) {
    throw new Error("A valid review has not been provided."); // require review payload
  }
// validate rating value
  try {
    const docRef = doc(collection(db, "albums"), albumId); // reference to the album doc
    const newRatingDocument = doc(
      collection(db, `albums/${albumId}/ratings`)
    ); // create a new document reference for the rating

    // corrected line
    await runTransaction(db, transaction =>
      updateWithRating(transaction, docRef, newRatingDocument, review)
    ); // run the transaction to update aggregates and write rating
  } catch (error) {
    console.error(
      "There was an error adding the rating to the album",
      error
    );
    throw error; // rethrow after logging
  }
}

// apply optional filters to a query for albums
function applyQueryFilters(q, { genre, year, ratingRange, sort }) {
  // filter by genre when provided
  if (genre) {
    q = query(q, where("genre", "==", genre)); // add genre filter
  }
  // filter by year when provided
  if (year) {
    q = query(q, where("year", "==", year)); // add year filter
  }
  // filter by rating range when provided
  if (ratingRange) {
    // ratingRange is expected to be a string like "Highly Rated", "Popular", etc.
    q = query(q, where("ratingRange", "==", ratingRange)); // add ratingRange filter
  }
  // apply sort ordering (default to average rating desc)
  if (sort === "Rating" || !sort) {
    q = query(q, orderBy("avgRating", "desc")); // sort by avgRating desc
  } else if (sort === "Review") {
    q = query(q, orderBy("numRatings", "desc")); // sort by number of reviews desc
  }
  // return the modified query
  return q;
}

// fetch albums (server-side usage) with optional filters
export async function getAlbums(db = db, filters = {}) {
  // start a base query for albums
  let q = query(collection(db, "albums")); // select all albums

  // apply provided query filters
  q = applyQueryFilters(q, filters); // narrow results based on filters
  // execute the query
  const results = await getDocs(q); // run the Firestore query
  // map documents to plain objects with date conversion
  return results.docs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data(),
      // Only plain objects can be passed to Client Components from Server Components
      timestamp: doc.data().timestamp.toDate(), // convert Firestore Timestamp to JS Date
    };
  });
}


// function provides a callback mechanism so that the callback is invoked every time a change is made to the albums collection
// subscribe to realtime updates for albums collection
export function getAlbumsSnapshot(cb, filters = {}) {
  // validate callback
  if (typeof cb !== "function") {
    console.log("Error: The callback parameter is not a function");
    return; // early return if cb is not callable
  }

  // create base query and apply filters
  let q = query(collection(db, "albums"));
  q = applyQueryFilters(q, filters); // apply filters to realtime query
  // return the onSnapshot unsubscribe function
  return onSnapshot(q, (querySnapshot) => {
    const results = querySnapshot.docs.map((doc) => {
      return {
        id: doc.id,
        ...doc.data(),
        // Only plain objects can be passed to Client Components from Server Components
        timestamp: doc.data().timestamp.toDate(),
      };
    });

    // invoke the caller's callback with the results
    cb(results);
  });
}
// Fetch a single album by ID
// fetch a single album by ID
export async function getAlbumById(db, albumId) {
  // validate id
  if (!albumId) {
    console.log("Error: Invalid ID received: ", albumId);
    return; // bail out when id missing
  }
  // create a reference to the album document
  const docRef = doc(db, "albums", albumId); // document reference
  // fetch the document snapshot
  const docSnap = await getDoc(docRef); // get document data
  // check if document exists before accessing data
  if (!docSnap.exists()) {
    return null; // return null if document doesn't exist
  }
  // return plain object with converted timestamp
  return {
    ...docSnap.data(),
    timestamp: docSnap.data().timestamp.toDate(), // convert Firestore Timestamp to JS Date
  };
}

/**
 * Subscribe to realtime updates for a single album document.
 *
 * @param {string} albumId - ID of the album to subscribe to
 * @param {(data: object|null) => void} cb - Callback invoked with the album data
 * @returns {function()} unsubscribe function returned by onSnapshot
 */
// function subscribes to realtime updates for a single album
export function getAlbumSnapshotById(albumId, cb) {
  // validate input
  if (!albumId) {
    console.log("Error: Invalid albumId received: ", albumId);
    return; // invalid input
  }

  // reference to the album document
  const albumRef = doc(db, "albums", albumId); // doc reference
  // subscribe and invoke cb with plain data on updates
  return onSnapshot(albumRef, (docSnap) => {
    if (!docSnap.exists()) {
      cb(null); // notify caller that doc does not exist
      return;
    }
    const data = {
      id: docSnap.id,
      ...docSnap.data(),
      timestamp: docSnap.data().timestamp.toDate(),
    };
    cb(data); // send updated data to caller
  });
}

// fetch reviews for an album ordered by timestamp desc
export async function getReviewsByAlbumId(db, albumId) {
  // validate id
  if (!albumId) {
    console.log("Error: Invalid albumId received: ", albumId);
    return; // invalid input
  }

  // build query against the ratings subcollection
  const q = query(
    collection(db, "albums", albumId, "ratings"),
    orderBy("timestamp", "desc")
  ); // order ratings newest-first

  // execute and map results
  const results = await getDocs(q); // run the query
  return results.docs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data(),
      // Only plain objects can be passed to Client Components from Server Components
      timestamp: doc.data().timestamp.toDate(),
    };
  });
}

// subscribe to realtime updates for reviews of an album
export function getReviewsSnapshotByAlbumId(albumId, cb) {
  // validate input
  if (!albumId) {
    console.log("Error: Invalid albumId received: ", albumId);
    return; // invalid input
  }

  // query the ratings subcollection ordered by timestamp
  const q = query(
    collection(db, "albums", albumId, "ratings"),
    orderBy("timestamp", "desc")
  ); // newest ratings first
  // subscribe and map results to plain objects
  return onSnapshot(q, (querySnapshot) => {
    const results = querySnapshot.docs.map((doc) => {
      return {
        id: doc.id,
        ...doc.data(),
        // Only plain objects can be passed to Client Components from Server Components
        timestamp: doc.data().timestamp.toDate(),
      };
    });
    cb(results); // call the provided callback with mapped results
  });
}

// generate and add fake albums and reviews to Firestore (dev helper)
export async function addFakeAlbumsAndReviews() {
  // generate fake data
  const data = await generateFakeAlbumsAndReviews(); // create sample albums + ratings
  // iterate and write to Firestore
  for (const { albumData, ratingsData } of data) {
    try {
      const docRef = await addDoc(
        collection(db, "albums"),
        albumData
      ); // add album doc and get reference

      for (const ratingData of ratingsData) {
        await addDoc(
          collection(db, "albums", docRef.id, "ratings"),
          ratingData
        ); // add rating docs under the album
      }
    } catch (e) {
      console.log("There was an error adding the document");
      console.error("Error adding document: ", e);
    }
  }
}
