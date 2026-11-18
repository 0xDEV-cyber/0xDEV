import type { MovieItem } from '../hooks/useMovies';

/**
 * Curated starter catalog of verified public-domain & Creative Commons
 * MP4 releases hosted on Internet Archive (archive.org).
 */
export const VERIFIED_ARCHIVE_MOVIES: MovieItem[] = [
  {
    movieId: 'IA-BigBuckBunny-328',
    title: 'Big Buck Bunny',
    category: 'Short Films',
    releaseYear: '2008',
    durationLabel: '10m',
    qualityLabel: '480p Lite',
    fileSizeLabel: '41 MB',
    synopsis:
      'Produced by the Blender Institute as an open-source animated short film, Big Buck Bunny follows a gentle giant rabbit whose peaceful morning in the meadow is interrupted by three mischievous woodland bullies.',
    posterUrl: 'https://archive.org/services/img/BigBuckBunny_328',
    videoUrl: 'https://archive.org/download/BigBuckBunny_328/BigBuckBunny_512kb.mp4',
    published: true,
    createdAtMs: 1700000006000,
  },
  {
    movieId: 'IA-Sintel-2010',
    title: 'Sintel',
    category: 'Short Films',
    releaseYear: '2010',
    durationLabel: '15m',
    qualityLabel: '720p HD',
    fileSizeLabel: '74 MB',
    synopsis:
      'A lonely wanderer named Sintel travels across harsh lands searching for Scales, a baby dragon she befriended and lost. Licensed under Creative Commons Attribution by the Blender Foundation and archived for free viewing and download.',
    posterUrl: 'https://archive.org/services/img/Sintel',
    videoUrl: 'https://archive.org/download/Sintel/sintel-2048-stereo_512kb.mp4',
    published: true,
    createdAtMs: 1700000005000,
  },
  {
    movieId: 'IA-TheMacin-1985',
    title: 'The Macintosh Computer (1985 Broadcast)',
    category: 'Tech Documentaries',
    releaseYear: '1985',
    durationLabel: '30m',
    qualityLabel: '480p Lite',
    fileSizeLabel: '123 MB',
    synopsis:
      'An archival episode examining the early Apple Macintosh computer, desktop software architecture, and developer tools, featuring Joanna Hoffman, Gary Kildall, Bob Foster, and Lee Lorenzen.',
    posterUrl: 'https://archive.org/services/img/TheMacin1985',
    videoUrl: 'https://archive.org/download/TheMacin1985/TheMacin1985_512kb.mp4',
    published: true,
    createdAtMs: 1700000004000,
  },
  {
    movieId: 'IA-Hypercard-1987',
    title: 'HyperCard: Software Architecture Special',
    category: 'Tech Documentaries',
    releaseYear: '1987',
    durationLabel: '27m',
    qualityLabel: '480p Lite',
    fileSizeLabel: '108 MB',
    synopsis:
      'HyperCard creator Bill Atkinson and senior engineer Dan Winkler walk through early hypermedia stacks, scripting concepts, and interactive computing demonstrations preserved on Internet Archive.',
    posterUrl: 'https://archive.org/services/img/CC501_hypercard',
    videoUrl: 'https://archive.org/download/CC501_hypercard/CC501_hypercard_512kb.mp4',
    published: true,
    createdAtMs: 1700000003000,
  },
  {
    movieId: 'IA-HisGirlFriday-1940',
    title: 'His Girl Friday',
    category: 'Open Classics',
    releaseYear: '1940',
    durationLabel: '1h 32m',
    qualityLabel: '480p Lite',
    fileSizeLabel: '383 MB',
    synopsis:
      'Directed by Howard Hawks and starring Cary Grant and Rosalind Russell, this fast-paced classic follows a hard-charging newspaper editor determined to pull his star reporter and ex-wife back onto one last breaking story.',
    posterUrl: 'https://archive.org/services/img/his_girl_friday',
    videoUrl: 'https://archive.org/download/his_girl_friday/his_girl_friday_512kb.mp4',
    published: true,
    createdAtMs: 1700000002000,
  },
  {
    movieId: 'IA-TheGeneral-1927',
    title: 'The General',
    category: 'Open Classics',
    releaseYear: '1927',
    durationLabel: '1h 07m',
    qualityLabel: '480p Lite',
    fileSizeLabel: '279 MB',
    synopsis:
      'Buster Keaton stars as railroad engineer Johnnie Gray in one of silent cinema’s most celebrated action adventures, restored in public domain and packaged cleanly for offline saving.',
    posterUrl: 'https://archive.org/services/img/TheGeneral',
    videoUrl: 'https://archive.org/download/TheGeneral/The_General_512kb.mp4',
    published: true,
    createdAtMs: 1700000001000,
  },
];
