"use client";

// This components handles the album listings page
// It receives data from src/app/page.jsx, such as the initial albums and search params from the URL

import Link from "next/link";
import { React, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import renderStars from "@/src/components/Stars.jsx";
import { getAlbumsSnapshot } from "@/src/lib/firebase/firestore.js";
import Filters from "@/src/components/Filters.jsx";

const AlbumItem = ({ album }) => (
  <li key={album.id}>
    <Link href={`/album/${album.id}`}>
      <ActiveAlbum album={album} />
    </Link>
  </li>
);

const ActiveAlbum = ({ album }) => (
  <div>
    <ImageCover coverArt={album.coverArt} name={album.name} />
    <AlbumDetails album={album} />
  </div>
);

const ImageCover = ({ coverArt, name }) => (
  <div className="image-cover">
    <img src={coverArt} alt={name} />
  </div>
);

const AlbumDetails = ({ album }) => (
  <div className="restaurant__details">
    <h2>{album.name}</h2>
    <AlbumRating album={album} />
    <AlbumMetadata album={album} />
  </div>
);

const AlbumRating = ({ album }) => (
  <div className="restaurant__rating">
    <ul>{renderStars(album.avgRating)}</ul>
    <span>({album.numRatings})</span>
  </div>
);

const AlbumMetadata = ({ album }) => (
  <div className="restaurant__meta">
    <p>
      {album.genre} | {album.year}
    </p>
    <p>{album.ratingRange}</p>
  </div>
);

export default function AlbumListings({
  initialAlbums,
  searchParams,
}) {
  const router = useRouter();

  // The initial filters are the search params from the URL, useful for when the user refreshes the page
  const initialFilters = {
    year: searchParams.year || "",
    genre: searchParams.genre || "",
    ratingRange: searchParams.ratingRange || "",
    sort: searchParams.sort || "",
  };

  const [albums, setAlbums] = useState(initialAlbums);
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    routerWithFilters(router, filters);
  }, [router, filters]);

  useEffect(() => {
    return getAlbumsSnapshot((data) => {
      setAlbums(data);
    }, filters);
  }, [filters]);

  return (
    <article>
      <Filters filters={filters} setFilters={setFilters} />
      <ul className="restaurants">
        {albums.map((album) => (
          <AlbumItem key={album.id} album={album} />
        ))}
      </ul>
    </article>
  );
}

function routerWithFilters(router, filters) {
  const queryParams = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      queryParams.append(key, value);
    }
  }

  const queryString = queryParams.toString();
  router.push(`?${queryString}`);
}

