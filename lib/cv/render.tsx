import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { CvContent } from "../types";

const DARK = "#111111";
const MID = "#555555";
const BODY = "#2d2d2d";
const RULE = "#cccccc";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: BODY,
    paddingTop: 38,
    paddingBottom: 38,
    paddingHorizontal: 42,
    backgroundColor: "#ffffff",
  },

  // ── Header ─────────────────────────────────────────────────────────
  headerName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 26,
    letterSpacing: 3,
    color: DARK,
    textAlign: "center",
    textTransform: "uppercase",
  },
  headerTagline: {
    fontSize: 8,
    letterSpacing: 5,
    color: MID,
    textAlign: "center",
    marginTop: 4,
    textTransform: "uppercase",
  },
  headerContact: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 8,
    fontSize: 8,
    color: "#444444",
  },

  // ── Dividers ────────────────────────────────────────────────────────
  hrFull: {
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    marginVertical: 8,
  },
  hrCol: {
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    marginVertical: 7,
  },

  // ── Section heading ─────────────────────────────────────────────────
  heading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: DARK,
    marginBottom: 6,
  },

  // ── About ───────────────────────────────────────────────────────────
  aboutText: {
    fontSize: 9,
    lineHeight: 1.45,
    color: BODY,
  },

  // ── Two-column ──────────────────────────────────────────────────────
  columns: {
    flexDirection: "row",
    flex: 1,
  },
  leftCol: {
    width: "33%",
    paddingRight: 14,
    borderRightWidth: 0.5,
    borderRightColor: RULE,
  },
  rightCol: {
    flex: 1,
    paddingLeft: 14,
  },

  // ── Education ───────────────────────────────────────────────────────
  eduDegree: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: DARK,
    lineHeight: 1.3,
  },
  eduMeta: {
    fontSize: 8,
    color: MID,
    marginTop: 1,
    marginBottom: 6,
  },

  // ── Bullet list ─────────────────────────────────────────────────────
  bulletRow: {
    flexDirection: "row",
    marginBottom: 1.5,
  },
  bulletDot: {
    width: 9,
    fontSize: 9,
    color: MID,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: BODY,
    lineHeight: 1.4,
  },

  // ── Career entries ──────────────────────────────────────────────────
  careerEntry: {
    flexDirection: "row",
    marginBottom: 10,
  },
  careerYear: {
    width: 68,
    fontSize: 8,
    color: MID,
    paddingTop: 1,
    flexShrink: 0,
  },
  careerContent: {
    flex: 1,
  },
  careerCompany: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: DARK,
    textTransform: "uppercase",
  },
  careerRole: {
    fontSize: 8,
    color: MID,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1,
    marginBottom: 3,
  },
  careerBullet: {
    fontSize: 8.5,
    color: BODY,
    lineHeight: 1.4,
    marginBottom: 2,
  },

  // ── Referrals ───────────────────────────────────────────────────────
  referralsRow: {
    flexDirection: "row",
    gap: 20,
  },
  referralName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: DARK,
    textTransform: "uppercase",
  },
  referralMeta: {
    fontSize: 8,
    color: MID,
    marginTop: 1,
  },
});

function Bullet({ text }: { text: string }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{text}</Text>
    </View>
  );
}

function CvDocument({ content }: { content: CvContent }) {
  const { about, skills, experience, education, languages, referrals, meta } = content;
  const confirmedReferrals = referrals.filter((r) => r.name !== "TBD");

  return (
    <Document
      title={`CV — ${meta.target_role} at ${meta.target_company}`}
      author="Nicola Lombardi"
    >
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View>
          <Text style={s.headerName}>Nicola Lombardi</Text>
          <Text style={s.headerTagline}>
            Business Development · Fintech · AI · Operations
          </Text>
          <View style={s.headerContact}>
            <Text>+34 603 376 602</Text>
            <Text>nicolalombardi@mac.com</Text>
            <Text>Madrid, Spain</Text>
          </View>
        </View>

        <View style={s.hrFull} />

        {/* ── About (full width) ── */}
        <View style={{ marginBottom: 8 }}>
          <Text style={s.heading}>About</Text>
          <Text style={s.aboutText}>{about}</Text>
        </View>

        <View style={s.hrFull} />

        {/* ── Two columns ── */}
        <View style={s.columns}>
          {/* Left */}
          <View style={s.leftCol}>
            {/* Education */}
            <Text style={s.heading}>Education</Text>
            {education.map((edu, i) => (
              <View key={i}>
                <Text style={s.eduDegree}>{edu.degree}</Text>
                <Text style={s.eduMeta}>
                  {edu.institution.split(",")[0]}, {edu.location.split(",")[0]}{" "}
                  {edu.year}
                </Text>
              </View>
            ))}

            <View style={s.hrCol} />

            {/* Skills */}
            <Text style={s.heading}>What I Can Bring</Text>
            {skills.map((skill, i) => (
              <Bullet key={i} text={skill} />
            ))}

            <View style={s.hrCol} />

            {/* Languages */}
            <Text style={s.heading}>Languages</Text>
            {languages.map((lang, i) => (
              <Bullet key={i} text={`${lang.language} (${lang.level})`} />
            ))}
          </View>

          {/* Right */}
          <View style={s.rightCol}>
            {/* Career */}
            <Text style={s.heading}>Professional Career</Text>
            {experience.map((exp, i) => (
              <View key={i} style={s.careerEntry}>
                <Text style={s.careerYear}>{exp.period}</Text>
                <View style={s.careerContent}>
                  <Text style={s.careerCompany}>{exp.company}</Text>
                  <Text style={s.careerRole}>{exp.role}</Text>
                  {exp.bullets.map((bullet, j) => (
                    <Text key={j} style={s.careerBullet}>
                      {bullet}
                    </Text>
                  ))}
                </View>
              </View>
            ))}

            {/* Referrals */}
            {confirmedReferrals.length > 0 && (
              <>
                <View style={s.hrCol} />
                <Text style={s.heading}>Referrals</Text>
                <View style={s.referralsRow}>
                  {confirmedReferrals.map((ref, i) => (
                    <View key={i} style={{ flex: 1 }}>
                      <Text style={s.referralName}>{ref.name}</Text>
                      <Text style={s.referralMeta}>{ref.title}</Text>
                      <Text style={s.referralMeta}>{ref.company}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function generateCvPdf(content: CvContent): Promise<Buffer> {
  return renderToBuffer(<CvDocument content={content} />);
}
