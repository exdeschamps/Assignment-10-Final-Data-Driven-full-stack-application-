import Album from "@/src/components/Album.jsx";
import { Suspense } from "react";
import { getAlbumById } from "@/src/lib/firebase/firestore.js";
import {
  getAuthenticatedAppForUser,
  getAuthenticatedAppForUser as getUser,
} from "@/src/lib/firebase/serverApp.js";
import ReviewsList, {
  ReviewsListSkeleton,
} from "@/src/components/Reviews/ReviewsList";
import {
  GeminiSummary,
  GeminiSummarySkeleton,
} from "@/src/components/Reviews/ReviewSummary";
import { getFirestore } from "firebase/firestore";

export default async function Home(props) {
  // This is a server component, we can access URL
  // parameters via Next.js and download the data
  // we need for this page
  const params = await props.params;
  const { currentUser } = await getUser();
  const { firebaseServerApp } = await getAuthenticatedAppForUser();
  const album = await getAlbumById(
    getFirestore(firebaseServerApp),
    params.id
  );

  // Handle case where album doesn't exist
  if (!album) {
    return (
      <main className="main__restaurant">
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2>Album not found</h2>
          <p>The album you're looking for doesn't exist.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main__restaurant">
      <Album
        id={params.id}
        initialAlbum={album}
        initialUserId={currentUser?.uid || ""}
      >
        <Suspense fallback={<GeminiSummarySkeleton />}>
          <GeminiSummary albumId={params.id} />
        </Suspense>
      </Album>
      <Suspense
        fallback={<ReviewsListSkeleton numReviews={album.numRatings} />}
      >
        <ReviewsList albumId={params.id} userId={currentUser?.uid || ""} />
      </Suspense>
    </main>
  );
}

