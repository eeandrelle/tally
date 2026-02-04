import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";

export function useDatabase() {
  const [db, setDb] = useState<Database | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initDb() {
      try {
        setIsLoading(true);
        const database = await Database.load("sqlite:default.db");
        if (isMounted) {
          setDb(database);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to connect to database");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initDb();

    return () => {
      isMounted = false;
    };
  }, []);

  return { db, isLoading, error };
}
