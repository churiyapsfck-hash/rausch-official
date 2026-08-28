import { useEffect, useState } from "react";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { PurchasesPage } from "@/pages/PurchasesPage";
import { PublicPassPage } from "@/pages/PublicPassPage";
import { AdminPage } from "@/pages/AdminPage";
import { ScannerPage } from "@/pages/ScannerPage";

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", onLocationChange);
    return () => window.removeEventListener("popstate", onLocationChange);
  }, []);

  // Route matching
  if (currentPath === "/login") {
    return <LoginPage />;
  }

  if (currentPath === "/purchases") {
    return <PurchasesPage />;
  }

  if (currentPath.startsWith("/p/")) {
    const token = currentPath.replace("/p/", "");
    return <PublicPassPage token={token} />;
  }

  if (currentPath === "/admin" || currentPath === "/x7k9-ctrl") {
    return <AdminPage />;
  }

  if (currentPath === "/scan" || currentPath === "/z3n-scan") {
    return <ScannerPage />;
  }

  return <HomePage />;
}
