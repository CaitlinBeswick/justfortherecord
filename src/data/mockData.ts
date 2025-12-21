import inRainbowsCover from "@/assets/in-rainbows-cover.jpg";

// Using Wikipedia/Wikimedia Commons images for real album covers
export const featuredAlbums = [
  {
    id: "1",
    title: "In Rainbows",
    artist: "Radiohead",
    coverUrl: inRainbowsCover,
    rating: 5,
    year: 2007,
  },
  {
    id: "2",
    title: "To Pimp a Butterfly",
    artist: "Kendrick Lamar",
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/f/f6/Kendrick_Lamar_-_To_Pimp_a_Butterfly.png",
    rating: 5,
    year: 2015,
  },
  {
    id: "3",
    title: "Blonde",
    artist: "Frank Ocean",
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/a/a0/Blonde_-_Frank_Ocean.jpeg",
    rating: 4,
    year: 2016,
  },
  {
    id: "4",
    title: "Currents",
    artist: "Tame Impala",
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/9/9b/Tame_Impala_-_Currents.png",
    rating: 4,
    year: 2015,
  },
  {
    id: "5",
    title: "The Dark Side of the Moon",
    artist: "Pink Floyd",
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/3/3b/Dark_Side_of_the_Moon.png",
    rating: 5,
    year: 1973,
  },
  {
    id: "6",
    title: "Abbey Road",
    artist: "The Beatles",
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/4/42/Beatles_-_Abbey_Road.jpg",
    rating: 5,
    year: 1969,
  },
];

export const popularArtists = [
  {
    id: "1",
    name: "Radiohead",
    imageUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=300&h=300&fit=crop",
    genres: ["Alternative Rock", "Art Rock"],
  },
  {
    id: "2",
    name: "Kendrick Lamar",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
    genres: ["Hip Hop", "Conscious Rap"],
  },
  {
    id: "3",
    name: "Frank Ocean",
    imageUrl: "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=300&h=300&fit=crop",
    genres: ["R&B", "Alternative"],
  },
  {
    id: "4",
    name: "Tame Impala",
    imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop",
    genres: ["Psychedelic", "Synth-pop"],
  },
  {
    id: "5",
    name: "The Beatles",
    imageUrl: "https://images.unsplash.com/photo-1484755560615-a4c64e778a6c?w=300&h=300&fit=crop",
    genres: ["Rock", "Pop"],
  },
  {
    id: "6",
    name: "Pink Floyd",
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop",
    genres: ["Progressive Rock", "Psychedelic"],
  },
];

// Using Wikipedia/Wikimedia Commons images which are more reliably accessible
export const recentReviews = [
  {
    id: "1",
    albumTitle: "In Rainbows",
    albumCover: inRainbowsCover,
    artist: "Radiohead",
    username: "musiclover42",
    userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
    rating: 5,
    review: "An absolute masterpiece. Every track flows seamlessly into the next, creating an immersive experience that rewards multiple listens.",
    likes: 234,
    comments: 18,
    date: "2 hours ago",
  },
  {
    id: "2",
    albumTitle: "To Pimp a Butterfly",
    albumCover: "https://upload.wikimedia.org/wikipedia/en/f/f6/Kendrick_Lamar_-_To_Pimp_a_Butterfly.png",
    artist: "Kendrick Lamar",
    username: "hiphophead",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    rating: 5,
    review: "Revolutionary. Kendrick weaves jazz, funk, and spoken word into a powerful commentary on race and identity in America.",
    likes: 456,
    comments: 32,
    date: "5 hours ago",
  },
  {
    id: "3",
    albumTitle: "Blonde",
    albumCover: "https://upload.wikimedia.org/wikipedia/en/a/a0/Blonde_-_Frank_Ocean.jpeg",
    artist: "Frank Ocean",
    username: "oceanfan",
    userAvatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop",
    rating: 4,
    review: "Ethereal and deeply personal. Frank's vulnerability is felt in every note. A slow burn that reveals new layers each listen.",
    likes: 189,
    comments: 14,
    date: "1 day ago",
  },
];

export const userStats = {
  albumsLogged: 342,
  songsLogged: 2847,
  artistsFollowed: 156,
  reviewsWritten: 89,
  listsCreated: 12,
};
