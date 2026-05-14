import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import { useAuth } from "@/store/auth";

import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";

import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";

import Dashboard from "@/pages/Dashboard";
import Calendar from "@/pages/Calendar";
import Homework from "@/pages/Homework";
import Lessons from "@/pages/Lessons";
import Exams from "@/pages/Exams";
import Interrogations from "@/pages/Interrogations";
import Absences from "@/pages/Absences";
import Notifications from "@/pages/Notifications";
import Classes from "@/pages/Classes";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

import AIChat from "@/pages/ai/AIChat";
import RagPdf from "@/pages/ai/RagPdf";
import ConceptMaps from "@/pages/ai/ConceptMaps";
import VoicePage from "@/pages/ai/Voice";

export default function App() {
  const { init } = useAuth();
  useEffect(() => {
    init();
  }, [init]);

  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Autenticazione */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />

        {/* App protetta */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/homework" element={<Homework />} />
          <Route path="/lessons" element={<Lessons />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/interrogations" element={<Interrogations />} />
          <Route path="/absences" element={<Absences />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />

          {/* Docente / Admin */}
          <Route
            path="/classes"
            element={
              <ProtectedRoute roles={["teacher", "admin"]}>
                <Classes />
              </ProtectedRoute>
            }
          />

          {/* AI */}
          <Route path="/ai/chat" element={<AIChat />} />
          <Route path="/ai/rag" element={<RagPdf />} />
          <Route path="/ai/concept-maps" element={<ConceptMaps />} />
          <Route path="/ai/voice" element={<VoicePage />} />

          {/* Catch-all dentro shell */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Redirect legacy */}
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route
          path="/register"
          element={<Navigate to="/auth/register" replace />}
        />
      </Routes>
    </AnimatePresence>
  );
}
