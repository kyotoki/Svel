export type ActivityType = "scuba" | "snorkeling" | "freediving";

// Used only by the profile analytics filter - "all" has no meaning when
// logging a single adventure, which always needs one concrete ActivityType.
export type ActivityFilter = ActivityType | "all";

export interface Adventure {
  id: number;
  title: string;
  date: string;
  // HH:MM, 24-hour, local time as entered - optional (see
  // hooks/useAdventureForm.ts and components/log/TimeOfAdventureField.tsx).
  time_of_day: string | null;
  created_at: string;
  location_name: string;
  latitude: number;
  longitude: number;
  max_depth_meters: number;
  duration_minutes: number;
  notes: string | null;
  photos: string[];
  water_temp_c: number | null;
  wave_height_m: number | null;
  tide_height_m: number | null;
  activity_type: ActivityType;
  tank_pressure_bar: number | null;
  gas_mix: string | null;
  // A list of Species.id values (constants/marineLife.ts) spotted during
  // this adventure - an open list of strings on this type deliberately,
  // same as activity_type's relationship to constants/activityTypes.ts.
  species: string[];
}

export type AdventureInput = Omit<Adventure, "id">;

export interface DiveStats {
  total_dives: number;
  deepest_dive_meters: number | null;
  total_minutes_underwater: number;
  countries_visited: number;
  favorite_site: string | null;
}

export interface ActivityStats {
  activity_type: ActivityType;
  total_trips: number;
  total_minutes: number;
  deepest_meters: number | null;
  average_bottom_time_minutes: number | null;
  favorite_site: string | null;
}
