"use client"; // run this component on the client side (Next.js directive)

// This components shows one individual album
// It receives data from src/app/album/[id]/page.jsx

import { React, useState, useEffect, Suspense } from "react"; // hooks and Suspense for lazy UI
import dynamic from "next/dynamic"; // dynamic import helper for code-splitting
import { getAlbumSnapshotById } from "@/src/lib/firebase/firestore.js"; // realtime Firestore helper
import { useUser } from "@/src/lib/getUser"; // custom hook to get the current user
import AlbumDetails from "@/src/components/AlbumDetails.jsx"; // presentational child component
import { updateAlbumImage } from "@/src/lib/firebase/storage.js"; // helper to upload images and update refs

const ReviewDialog = dynamic(() => import("@/src/components/ReviewDialog.jsx")); // load ReviewDialog lazily

export default function Album({
  id,
  initialAlbum,
  initialUserId,
  children,
}) {
  const [albumDetails, setAlbumDetails] = useState(initialAlbum); // store album data in state
  const [isOpen, setIsOpen] = useState(false); // whether the review dialog is open

  // The only reason this component needs to know the user ID is to associate a review with the user, and to know whether to show the review dialog
  const userId = useUser()?.uid || initialUserId; // prefer logged-in user ID, fallback to server-provided initialUserId
  const [review, setReview] = useState({
    rating: 0,
    text: "",
  }); // local state for an in-progress review

  const onChange = (value, name) => {
    setReview({ ...review, [name]: value }); // update a single field in the review object
  };

  async function handleAlbumImage(target) {
    const image = target.files ? target.files[0] : null; // read first file from input target
    if (!image) {
      return; // no-op if there's no file
    }

    const imageURL = await updateAlbumImage(id, image); // upload and get public URL
    setAlbumDetails({ ...albumDetails, coverArt: imageURL }); // update state with new cover art URL
  }

  const handleClose = () => {
    setIsOpen(false); // close review dialog
    setReview({ rating: 0, text: "" }); // reset review state
  };

  useEffect(() => {
    // subscribe to realtime updates for this album and update state on changes
    return getAlbumSnapshotById(id, (data) => {
      setAlbumDetails(data);
    });
  }, [id]); // re-subscribe whenever the album id changes

  return (
    <>
      <AlbumDetails
        album={albumDetails}
        userId={userId}
        handleAlbumImage={handleAlbumImage}
        setIsOpen={setIsOpen}
        isOpen={isOpen}
      >
        {children}
      </AlbumDetails>
      {userId && (
        <Suspense fallback={<p>Loading...</p>}>
          <ReviewDialog
            isOpen={isOpen}
            handleClose={handleClose}
            review={review}
            onChange={onChange}
            userId={userId}
            id={id}
          />
        </Suspense>
      )}
    </>
  );
}

