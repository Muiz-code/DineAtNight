"use client";

import Loader from "./_components/loader";

export default function Home() {
  return (
    <div className="relative w-full min-h-screen bg-black">
      {/* Loader */}
      <Loader />

      {/* Main Content - scrollable below loader */}
      <main className="relative z-0 flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-black via-black to-black px-4 py-32">
        <div className="text-center space-y-8 max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-black text-white">
            Welcome to <span style={{ color: "#0FFF50", textShadow: "0 0 20px #0FFF50" }}>Dine@Night</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
            Experience the finest dining experience with our neon-inspired landing page. Scroll down to explore our menu and reservations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <button
              className="px-8 py-3 rounded-lg font-semibold transition-all duration-300"
              style={{
                color: "#0FFF50",
                borderColor: "#0FFF50",
                backgroundColor: "transparent",
                border: "2px solid",
                boxShadow: "0 0 20px rgba(15, 255, 80, 0.5)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#0FFF50";
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#0FFF50";
              }}
            >
              Make a Reservation
            </button>

            <button
              className="px-8 py-3 rounded-lg font-semibold transition-all duration-300"
              style={{
                color: "#FFFF00",
                borderColor: "#FFFF00",
                backgroundColor: "transparent",
                border: "2px solid",
                boxShadow: "0 0 20px rgba(255, 255, 0, 0.5)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#FFFF00";
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#FFFF00";
              }}
            >
              View Menu
            </button>

            <button
              className="px-8 py-3 rounded-lg font-semibold transition-all duration-300"
              style={{
                color: "#FF1744",
                borderColor: "#FF1744",
                backgroundColor: "transparent",
                border: "2px solid",
                boxShadow: "0 0 20px rgba(255, 23, 68, 0.5)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#FF1744";
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#FF1744";
              }}
            >
              Contact Us
            </button>
          </div>
        </div>

        {/* Feature Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 max-w-5xl">
          <div
            className="p-6 rounded-lg border-2 transition-all duration-300"
            style={{
              borderColor: "#0FFF50",
              backgroundColor: "rgba(15, 255, 80, 0.05)",
            }}
          >
            <h3 className="text-2xl font-bold mb-4" style={{ color: "#0FFF50" }}>
              Fine Dining
            </h3>
            <p className="text-gray-300">Experience exquisite cuisine prepared by our world-class chefs.</p>
          </div>

          <div
            className="p-6 rounded-lg border-2 transition-all duration-300"
            style={{
              borderColor: "#FFFF00",
              backgroundColor: "rgba(255, 255, 0, 0.05)",
            }}
          >
            <h3 className="text-2xl font-bold mb-4" style={{ color: "#FFFF00" }}>
              Ambiance
            </h3>
            <p className="text-gray-300">Dine in our vibrant, neon-lit atmosphere perfect for special occasions.</p>
          </div>

          <div
            className="p-6 rounded-lg border-2 transition-all duration-300"
            style={{
              borderColor: "#FF1744",
              backgroundColor: "rgba(255, 23, 68, 0.05)",
            }}
          >
            <h3 className="text-2xl font-bold mb-4" style={{ color: "#FF1744" }}>
              Service
            </h3>
            <p className="text-gray-300">Impeccable service and attention to detail from our dedicated staff.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
