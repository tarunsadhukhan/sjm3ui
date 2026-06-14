"use client"; // Ensure this component runs only on the client

import { useEffect, useState } from "react";
//import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";

export default function Home() {
//  const router = useRouter();
  const [subdomain, setSubdomain] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const subdomainPart = hostname.split(".")[0];
      setSubdomain(subdomainPart);

    //   const userCookie = document.cookie
    //     .split("; ")
    //     .find((row) => row.startsWith("user="))
    //     ?.split("=")[1];

    //   if (userCookie) {
    //     const user = JSON.parse(decodeURIComponent(userCookie));
    //     if (subdomain === "admin") {
    //       console.log("Redirecting to: /dashboardctrldesk"); // Log redirection URL
    //       router.push("/dashboardctrldesk");
    //     } else {
    //       console.log("Redirecting to: /dashboardportal"); // Log redirection URL
    //       router.push("/dashboardportal");
    //     }
    //   }
    }
  }, []);

  return (
    <main className="min-h-screen flex">
      {/* Left side - Welcome Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-emerald-800 to-teal-600 p-12 relative">
        <div
          className="absolute inset-0 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/app-icons/icon-1024.png')" }}
        ></div>
        {/* Dark overlay to keep the WELCOME text readable over the logo */}
        <div className="absolute inset-0 bg-black/40"></div>

        {/* Centering the text */}
        <div className="relative flex flex-col items-center justify-center w-full h-full text-white z-10">
          <h2 className="text-6xl font-bold text-center mb-12 drop-shadow-lg">WELCOME</h2>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center items-center w-full">
            <Image
              src="/ts-global-erp-glowing-128.gif"
              alt="TS Global ERP Logo"
              width={180}
              height={180}
              priority
              className="mx-auto w-auto h-auto"
              unoptimized
            />
          </div>
          <LoginForm subdomain={subdomain} />
        </div>
      </div>
    </main>
  );
}
