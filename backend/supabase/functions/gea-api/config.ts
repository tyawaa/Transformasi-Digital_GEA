import { ApiError } from "./errors.ts";
import { type MuseumArea, validateCoordinate } from "./geofence.ts";
import { parsePolygon } from "./polygon.ts";
import { uuid } from "./validation.ts";

export type Environment = { readonly [key: string]: string | undefined };
export type BackendConfig = {
  readonly supabaseUrl: string;
  readonly anonKey: string;
  readonly serviceRoleKey: string;
  readonly museumArea: MuseumArea | null;
  readonly allowedOrigins: readonly string[];
  readonly photoModel?: { readonly url: string; readonly token: string } | null;
};

function photoModelConfig(
  environment: Environment,
): NonNullable<BackendConfig["photoModel"]> | null {
  const url: string = environment.GEA_PHOTO_MODEL_URL?.trim() ?? "";
  const token: string = environment.GEA_PHOTO_MODEL_TOKEN?.trim() ?? "";
  if (url === "" && token === "") return null;
  if (url === "" || token.length < 32) {
    throw new ApiError(
      503,
      "PHOTO_MODEL_CONFIGURATION_INVALID",
      "Isi GEA_PHOTO_MODEL_URL dan token minimal 32 karakter.",
    );
  }
  const parsed: URL = new URL(url);
  if (
    parsed.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "host.docker.internal"].includes(parsed.hostname)
  ) {
    throw new ApiError(503, "PHOTO_MODEL_CONFIGURATION_INVALID", "Layanan model harus HTTPS.");
  }
  return { url: url.replace(/\/$/, ""), token };
}

function required(environment: Environment, key: string): string {
  const value: string | undefined = environment[key];
  if (value === undefined || value.trim() === "") {
    throw new ApiError(503, "BACKEND_NOT_CONFIGURED", `Environment ${key} belum diisi.`);
  }
  return value;
}

export function museumAreaFromEnvironment(environment: Environment): MuseumArea | null {
  const polygonJson = environment.GEA_MUSEUM_POLYGON_JSON?.trim();
  if (polygonJson) {
    try {
      const polygon = parsePolygon(JSON.parse(polygonJson));
      const reference = validateCoordinate({
        latitude: Number(required(environment, "GEA_MUSEUM_LATITUDE")),
        longitude: Number(required(environment, "GEA_MUSEUM_LONGITUDE")),
      });
      return {
        ...reference,
        polygon,
        zoneId: uuid(required(environment, "GEA_MUSEUM_ZONE_ID"), "GEA_MUSEUM_ZONE_ID"),
      };
    } catch {
      throw new ApiError(
        503,
        "MUSEUM_CONFIGURATION_INVALID",
        "Periksa JSON poligon, titik referensi, dan UUID zona museum. Tidak beralih ke lingkaran.",
      );
    }
  }
  const keys: readonly string[] = [
    "GEA_MUSEUM_LATITUDE",
    "GEA_MUSEUM_LONGITUDE",
    "GEA_MUSEUM_RADIUS_METERS",
    "GEA_MUSEUM_ZONE_ID",
  ];
  if (keys.some((key: string): boolean => !environment[key]?.trim())) return null;
  const latitude: number = Number(environment.GEA_MUSEUM_LATITUDE);
  const longitude: number = Number(environment.GEA_MUSEUM_LONGITUDE);
  const radiusMeters: number = Number(environment.GEA_MUSEUM_RADIUS_METERS);
  validateCoordinate({ latitude, longitude });
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new ApiError(
      503,
      "MUSEUM_CONFIGURATION_INVALID",
      "Radius museum harus positif dan finite.",
    );
  }
  return {
    latitude,
    longitude,
    radiusMeters,
    zoneId: uuid(environment.GEA_MUSEUM_ZONE_ID, "GEA_MUSEUM_ZONE_ID"),
  };
}

export function readConfig(environment: Environment): BackendConfig {
  const url: string = required(environment, "SUPABASE_URL").replace(/\/$/, "");
  const parsed: URL = new URL(url);
  if (
    parsed.protocol !== "https:" && parsed.hostname !== "127.0.0.1" &&
    parsed.hostname !== "localhost" && parsed.hostname !== "kong"
  ) {
    throw new ApiError(
      503,
      "BACKEND_CONFIGURATION_INVALID",
      "SUPABASE_URL harus menggunakan HTTPS.",
    );
  }
  return {
    supabaseUrl: url,
    anonKey: required(environment, "SUPABASE_ANON_KEY"),
    serviceRoleKey: required(environment, "SUPABASE_SERVICE_ROLE_KEY"),
    photoModel: photoModelConfig(environment),
    museumArea: museumAreaFromEnvironment(environment),
    allowedOrigins: (environment.GEA_ALLOWED_ORIGINS ?? "").split(",").map(
      (origin: string): string => origin.trim(),
    ).filter((origin: string): boolean => origin !== ""),
  };
}
