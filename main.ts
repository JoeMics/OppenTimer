import "https://deno.land/std@0.195.0/dotenv/load.ts";
import axiod from "https://deno.land/x/axiod@0.26.2/mod.ts";
import { default as format } from "https://deno.land/x/date_fns@v2.22.1/format/index.js";
import {
  bgBlue,
  brightBlue,
  red,
} from "https://deno.land/std@0.123.0/fmt/colors.ts";

// Date to check for movie times
const TARGET_DATE = "7/30/2023";

// Time constants
const _EVERY_10_SECONDS = 10000;
const _EVERY_MINUTE = 1000 * 60;
const _EVERY_15_MINUTES = 1000 * 60 * 15;
const _EVERY_HOUR = 1000 * 60 * 60;

// Interval for how often to check Cineplex for movie times
const INTERVAL = _EVERY_15_MINUTES; // 1 hour

console.log(
  "Checking for movie times every",
  INTERVAL / _EVERY_MINUTE,
  "minutes"
);

interface Session {
  showStartDateTime: Date;
  seatsRemaining: number;
}

interface Experience {
  experienceTypes: string[];
  sessions: Session[];
}

interface Movie {
  id: number;
  name: string;
  experiences: Experience[];
  detailPageUrl: string;
}

type MovieDate = {
  startDate: Date;
  movies: Movie[];
};

type Theatre = {
  theatre: string;
  theatreId: number;
  dates: MovieDate[];
};

type ShowTimes = Theatre[] | [];

// get request for oppenheimer times at Langley Cineplex for imax
const oppenTimer = async () => {
  const url = `https://apis.cineplex.com/prod/cpx/theatrical/api/v1/showtimes`;
  const getParams = {
    language: "en",
    locationId: 1405,
    date: TARGET_DATE,
    experiences: "imax",
  };
  const subscriptionKey = Deno.env.get("OCP_APIM_SUBSCRIPTION_KEY");
  const headers = {
    "Ocp-Apim-Subscription-Key": subscriptionKey || "",
  };

  const response = await axiod.get(url, { params: getParams, headers });

  const showTimes: ShowTimes = response.data;
  return showTimes;
};

const logResponse = (showTimes: ShowTimes) => {
  const logDateFormat = "yyyy-MM-dd h:mm:ss a";

  const logDate = bgBlue(format(new Date(), logDateFormat, null));

  if (!showTimes.length) {
    const message = "No theatre data available";
    return console.log(logDate, "-", message);
  }

  const langleyTheatre = showTimes[0];
  const movies = langleyTheatre.dates[0].movies;

  if (!movies.length) {
    const message = "No movie data available";
    return console.log(logDate, "-", message);
  }

  const movie = movies[0];
  const movieName = movie.name;
  const movieUrl = movie.detailPageUrl;

  const experiences = movie.experiences;
  const imaxExperience = experiences.find((experience) =>
    experience.experienceTypes.includes("70mm")
  );

  if (!imaxExperience) {
    const message = "No imax experience available";
    return console.log(logDate, "-", message);
  }

  const sessions = imaxExperience.sessions;
  for (const session of sessions) {
    // Format as Sunday July 30, 4:30 PM
    const formatString = "EEEE MMMM d, h:mm a";
    const date = format(
      new Date(session.showStartDateTime),
      formatString,
      null
    );

    // seats remaining in red
    const seatsRemaining = red(String(session.seatsRemaining));

    const message = `${movieName} at ${date} seats remaining: ${seatsRemaining}`;
    console.log(logDate, "-", message);
  }

  // terminal bell
  Deno.stdout.write(new TextEncoder().encode("\x07"));

  const message = `Movie Link: ${brightBlue(movieUrl)}`;
  console.log(logDate, "-", message);
};

export const logMovieTimes = async () => {
  const oppenTimerData = await oppenTimer();
  logResponse(oppenTimerData);
};

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
  // Main Execution
  logMovieTimes();
  setInterval(logMovieTimes, INTERVAL);
}
