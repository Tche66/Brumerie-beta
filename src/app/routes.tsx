import React from "react";
import { createBrowserRouter } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { RequireAuth } from "./components/RequireAuth";
import { RequireAdmin } from "./components/RequireAdmin";
import { HomePage } from "./pages/HomePage";
import { AuthPage } from "./pages/AuthPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { CreateAddressPage } from "./pages/CreateAddressPage";
import { AddressDetailsPage } from "./pages/AddressDetailsPage";
import { EditAddressPage } from "./pages/EditAddressPage";
import { ExplorePage } from "./pages/ExplorePage";
import { ProfilPage } from "./pages/ProfilPage";
import { MyPlacesPage } from "./pages/MyPlacesPage";
import { ApiDocsPage } from "./pages/ApiDocsPage";
import { ImportCsvPage } from "./pages/ImportCsvPage";
import { PlansPage } from "./pages/PlansPage";
import { AdminPage } from "./pages/AdminPage";
import { PolitiqueConfidentialitePage } from "./pages/PolitiqueConfidentialitePage";
import { ConditionsUtilisationPage } from "./pages/ConditionsUtilisationPage";
import { SystemStatus } from "./pages/SystemStatus";
import { NotFound } from "./pages/NotFound";
import { BrumerieAuthPage } from "./pages/BrumerieAuthPage";

export const router = createBrowserRouter([
  {
    Component: AppLayout,
    children: [
      { path: "/",                          Component: HomePage },
      { path: "/auth",                      Component: AuthPage },
      { path: "/reinitialiser-mot-de-passe",Component: ResetPasswordPage },
      { path: "/auth/brumerie",              Component: BrumerieAuthPage },
      { path: "/explorer",                  Component: ExplorePage },
      { path: "/api",                       Component: ApiDocsPage },
      { path: "/plans",                     Component: PlansPage },
      { path: "/politique-confidentialite", Component: PolitiqueConfidentialitePage },
      { path: "/conditions-utilisation",    Component: ConditionsUtilisationPage },
      { path: "/system-status",             Component: SystemStatus },

      // Admin — protégé par RequireAdmin (attend que profile soit chargé)
      { path: "/admin", element: <RequireAdmin><AdminPage /></RequireAdmin> },

      // Connecté
      { path: "/create",    element: <RequireAuth><CreateAddressPage /></RequireAuth> },
      { path: "/profil",    element: <RequireAuth><ProfilPage /></RequireAuth> },
      { path: "/mes-lieux", element: <RequireAuth><MyPlacesPage /></RequireAuth> },
      { path: "/import",    element: <RequireAuth><ImportCsvPage /></RequireAuth> },

      // Adresse
      { path: "/:addressCode",          Component: AddressDetailsPage },
      { path: "/:addressCode/modifier", Component: EditAddressPage },
      { path: "*",                      Component: NotFound },
    ],
  },
]);
