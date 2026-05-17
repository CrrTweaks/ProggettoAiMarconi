import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Restituisce le materie del teacher loggato, raggruppate per classe.
 * { class_id -> subject }
 */
export function useTeacherSubjects() {
  return useQuery({
    queryKey: ["me", "subjects"],
    queryFn: async () => {
      const { subjects } = (await api.get("/users/me/subjects")).data;
      return subjects || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Crea una mappa class_id -> subject dal risultato di useTeacherSubjects.
 */
export function buildSubjectMap(subjects = []) {
  return Object.fromEntries(subjects.map((s) => [s.class_id, s.subject]));
}
