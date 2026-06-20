import type { CvContent } from "@/lib/types";

function Section({ title }: { title: string }) {
  return (
    <p
      className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#111111] mb-1.5"
      style={{ letterSpacing: "0.08em" }}
    >
      {title}
    </p>
  );
}

export default function CvPreview({ content }: { content: CvContent }) {
  const { about, skills, experience, education, languages, referrals, meta } = content;
  const confirmed = referrals.filter((r) => r.name !== "TBD");

  return (
    <div
      className="bg-white shadow-xl mx-auto"
      style={{
        width: "595px",
        minHeight: "842px",
        padding: "38px 42px",
        fontFamily: "Helvetica, Arial, sans-serif",
        fontSize: "9px",
        color: "#2d2d2d",
        lineHeight: 1.4,
      }}
    >
      {/* Header */}
      <div className="text-center mb-3">
        <p
          style={{
            fontSize: "22px",
            fontWeight: 700,
            letterSpacing: "3px",
            color: "#111111",
            textTransform: "uppercase",
          }}
        >
          Nicola Lombardi
        </p>
        <p
          style={{
            fontSize: "7px",
            letterSpacing: "5px",
            color: "#555555",
            textTransform: "uppercase",
            marginTop: "3px",
          }}
        >
          Business Development · Fintech · AI · Operations
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            marginTop: "7px",
            fontSize: "8px",
            color: "#444444",
          }}
        >
          <span>+34 603 376 602</span>
          <span>nicolalombardi@mac.com</span>
          <span>Madrid, Spain</span>
        </div>
      </div>

      <hr style={{ borderColor: "#cccccc", margin: "8px 0" }} />

      {/* About */}
      <div style={{ marginBottom: "8px" }}>
        <Section title="About" />
        <p style={{ fontSize: "9px", lineHeight: 1.5, color: "#2d2d2d" }}>{about}</p>
      </div>

      <hr style={{ borderColor: "#cccccc", margin: "8px 0" }} />

      {/* Two columns */}
      <div style={{ display: "flex" }}>
        {/* Left */}
        <div
          style={{
            width: "33%",
            paddingRight: "14px",
            borderRight: "0.5px solid #cccccc",
          }}
        >
          {/* Education */}
          <Section title="Education" />
          {education.map((edu, i) => (
            <div key={i} style={{ marginBottom: "7px" }}>
              <p style={{ fontWeight: 700, fontSize: "9px", color: "#111111", lineHeight: 1.3 }}>
                {edu.degree}
              </p>
              <p style={{ fontSize: "8px", color: "#555555", marginTop: "1px" }}>
                {edu.institution.split(",")[0]}, {edu.location.split(",")[0]} {edu.year}
              </p>
            </div>
          ))}

          <hr style={{ borderColor: "#cccccc", margin: "7px 0" }} />

          {/* Skills */}
          <Section title="What I Can Bring" />
          {skills.map((skill, i) => (
            <div key={i} style={{ display: "flex", marginBottom: "2px" }}>
              <span style={{ width: "9px", color: "#555555", fontSize: "9px" }}>•</span>
              <span style={{ fontSize: "9px", color: "#2d2d2d" }}>{skill}</span>
            </div>
          ))}

          <hr style={{ borderColor: "#cccccc", margin: "7px 0" }} />

          {/* Languages */}
          <Section title="Languages" />
          {languages.map((lang, i) => (
            <div key={i} style={{ display: "flex", marginBottom: "2px" }}>
              <span style={{ width: "9px", color: "#555555", fontSize: "9px" }}>•</span>
              <span style={{ fontSize: "9px", color: "#2d2d2d" }}>
                {lang.language} ({lang.level})
              </span>
            </div>
          ))}
        </div>

        {/* Right */}
        <div style={{ flex: 1, paddingLeft: "14px" }}>
          <Section title="Professional Career" />
          {experience.map((exp, i) => (
            <div key={i} style={{ display: "flex", marginBottom: "10px" }}>
              <p
                style={{
                  width: "68px",
                  fontSize: "8px",
                  color: "#555555",
                  flexShrink: 0,
                  paddingTop: "1px",
                }}
              >
                {exp.period}
              </p>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: "10px",
                    color: "#111111",
                    textTransform: "uppercase",
                  }}
                >
                  {exp.company}
                </p>
                <p
                  style={{
                    fontSize: "8px",
                    color: "#555555",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginTop: "1px",
                    marginBottom: "3px",
                  }}
                >
                  {exp.role}
                </p>
                {exp.bullets.map((b, j) => (
                  <p
                    key={j}
                    style={{
                      fontSize: "8.5px",
                      color: "#2d2d2d",
                      lineHeight: 1.4,
                      marginBottom: "2px",
                    }}
                  >
                    {b}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {confirmed.length > 0 && (
            <>
              <hr style={{ borderColor: "#cccccc", margin: "7px 0" }} />
              <Section title="Referrals" />
              <div style={{ display: "flex", gap: "20px" }}>
                {confirmed.map((ref, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <p
                      style={{
                        fontWeight: 700,
                        fontSize: "9px",
                        color: "#111111",
                        textTransform: "uppercase",
                      }}
                    >
                      {ref.name}
                    </p>
                    <p style={{ fontSize: "8px", color: "#555555", marginTop: "1px" }}>
                      {ref.title}
                    </p>
                    <p style={{ fontSize: "8px", color: "#555555" }}>{ref.company}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
