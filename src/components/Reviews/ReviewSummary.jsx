import { gemini20Flash, googleAI } from "@genkit-ai/googleai"; // Gemini model & plugin helpers
import { genkit } from "genkit"; // Genkit client for calling Gemini
import { getReviewsByAlbumId } from "@/src/lib/firebase/firestore.js"; // helper to fetch reviews
import { getAuthenticatedAppForUser } from "@/src/lib/firebase/serverApp"; // helper to get a server-authenticated Firebase app
import { getFirestore } from "firebase/firestore"; // Firestore client constructor
// Component that fetches reviews and generates a summary using Gemini.
export async function GeminiSummary({ albumId }) {
  const { firebaseServerApp } = await getAuthenticatedAppForUser(); // get a Firebase app authenticated as the server
  const reviews = await getReviewsByAlbumId(
    getFirestore(firebaseServerApp),
    albumId
  ); // fetch reviews for this album from Firestore

  const reviewSeparator = "@"; // separator used when combining reviews into a single prompt string
  const prompt = `
    Based on the following album reviews, 
    where each review is separated by a '${reviewSeparator}' character, 
    create a one-sentence summary of what people think of the album. 

    Here are the reviews: ${reviews.map((review) => review.text).join(reviewSeparator)}
  `; // build the prompt for the Gemini model

  try {
    if (!process.env.GEMINI_API_KEY) {
      // Make sure GEMINI_API_KEY environment variable is set:
      // https://firebase.google.com/docs/genkit/get-started
      throw new Error(
        'GEMINI_API_KEY not set. Set it with "firebase apphosting:secrets:set GEMINI_API_KEY"'
      ); // throw helpful error when API key is missing
    }

    // Configure a Genkit instance.
    const ai = genkit({
      plugins: [googleAI()],
      model: gemini20Flash, // set default model
    }); // create an AI client with the Gemini plugin
    const { text } = await ai.generate(prompt); // generate text from the prompt

    return (
      <div className="restaurant__review_summary">
        <p>{text}</p>
        <p>✨ Summarized with Gemini</p>
      </div>
    );
  } catch (e) {
    console.error(e); // log any errors during summary generation
    return <p>Error summarizing reviews.</p>;
  }
}
// Skeleton component to show while waiting for Gemini response.
export function GeminiSummarySkeleton() {
  return (
    <div className="restaurant__review_summary">
      <p>✨ Summarizing reviews with Gemini...</p>
    </div>
  );
}
