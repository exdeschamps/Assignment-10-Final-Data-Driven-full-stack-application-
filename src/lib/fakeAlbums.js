import {
  randomNumberBetween,
  getRandomDateAfter,
  getRandomDateBefore,
} from "@/src/lib/utils.js";
import { randomData } from "@/src/lib/randomData.js";

import { Timestamp } from "firebase/firestore";

export async function generateFakeAlbumsAndReviews() {
  const albumsToAdd = 5;
  const data = [];

  for (let i = 0; i < albumsToAdd; i++) {
    const albumTimestamp = Timestamp.fromDate(getRandomDateBefore());

    const ratingsData = [];

    // Generate a random number of ratings/reviews for this album
    for (let j = 0; j < randomNumberBetween(0, 5); j++) {
      const ratingTimestamp = Timestamp.fromDate(
        getRandomDateAfter(albumTimestamp.toDate())
      );

      const ratingData = {
        rating:
          randomData.albumReviews[
            randomNumberBetween(0, randomData.albumReviews.length - 1)
          ].rating,
        text: randomData.albumReviews[
          randomNumberBetween(0, randomData.albumReviews.length - 1)
        ].text,
        userId: `User #${randomNumberBetween()}`,
        timestamp: ratingTimestamp,
      };

      ratingsData.push(ratingData);
    }

    const avgRating = ratingsData.length
      ? ratingsData.reduce(
          (accumulator, currentValue) => accumulator + currentValue.rating,
          0
        ) / ratingsData.length
      : 0;

    // Determine rating range based on avgRating
    let ratingRange;
    if (avgRating >= 4.5) {
      ratingRange = "Highly Rated";
    } else if (avgRating >= 3.5) {
      ratingRange = "Popular";
    } else if (avgRating >= 2.5) {
      ratingRange = "Emerging";
    } else {
      ratingRange = "Underrated";
    }

    const albumData = {
      genre:
        randomData.albumGenres[
          randomNumberBetween(0, randomData.albumGenres.length - 1)
        ],
      name: randomData.albumNames[
        randomNumberBetween(0, randomData.albumNames.length - 1)
      ],
      avgRating,
      year: randomData.albumYears[
        randomNumberBetween(0, randomData.albumYears.length - 1)
      ],
      numRatings: ratingsData.length,
      sumRating: ratingsData.reduce(
        (accumulator, currentValue) => accumulator + currentValue.rating,
        0
      ),
      ratingRange,
      coverArt: `https://storage.googleapis.com/firestorequickstarts.appspot.com/food_${randomNumberBetween(
        1,
        22
      )}.png`,
      timestamp: albumTimestamp,
    };

    data.push({
      albumData,
      ratingsData,
    });
  }
  return data;
}

