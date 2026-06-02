import { useNavigate } from "react-router-dom";


const FAQ = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F2EEE5] text-[#1E2E3E]">
      <div className="mx-auto max-w-md px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        </div>

        <h1
          className="font-playfair text-2xl mb-8"
          style={{ color: "#1E2E3E" }}
        >
          Frequently Asked Questions
        </h1>

        {/* Still need help */}
        <div className="pt-12 pb-8 text-center">
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              color: "#5B4A3F",
            }}
          >
            Still need help? Email us at{" "}
            <a
              href="mailto:hello@usetouchstone.app"
              style={{
                color: "#B8860B",
                textDecoration: "none",
              }}
            >
              hello@usetouchstone.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
