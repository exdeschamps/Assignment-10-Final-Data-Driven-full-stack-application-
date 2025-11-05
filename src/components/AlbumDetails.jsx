// This component shows album metadata, and offers some actions to the user like uploading a new album cover art, and adding a review.

import React from "react";
import renderStars from "@/src/components/Stars.jsx";

const AlbumDetails = ({
  album,
  userId,
  handleAlbumImage,
  setIsOpen,
  isOpen,
  children,
}) => {
  return (
    <section className="img__section">
      <img src={album.coverArt} alt={album.name} />

      <div className="actions">
        {userId && (
          <img
            alt="review"
            className="review"
            onClick={() => {
              setIsOpen(!isOpen);
            }}
            src="/review.svg"
          />
        )}
        <label
          onChange={(event) => handleAlbumImage(event.target)}
          htmlFor="upload-image"
          className="add"
        >
          <input
            name=""
            type="file"
            id="upload-image"
            className="file-input hidden w-full h-full"
          />

          <img className="add-image" src="/add.svg" alt="Add image" />
        </label>
      </div>

      <div className="details__container">
        <div className="details">
          <h2>{album.name}</h2>

          <div className="restaurant__rating">
            <ul>{renderStars(album.avgRating)}</ul>

            <span>({album.numRatings})</span>
          </div>

          <p>
            {album.genre} | {album.year}
          </p>
          <p>{album.ratingRange}</p>
          {children}
        </div>
      </div>
    </section>
  );
};

export default AlbumDetails;

