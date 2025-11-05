// Error boundary for album detail page
export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong loading this album!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}

