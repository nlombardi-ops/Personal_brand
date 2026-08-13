import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Svg,
  Path,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { format } from "date-fns";

const DARK = "#111111";
const MID = "#555555";
const BODY = "#2d2d2d";
const RULE = "#cccccc";
const NAVY = "#0f172a";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: BODY,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 52,
    backgroundColor: "#ffffff",
  },
  headerName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 26,
    color: NAVY,
  },
  headerContact: {
    flexDirection: "row",
    gap: 14,
    marginTop: 6,
    fontSize: 9,
    color: MID,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    marginTop: 10,
    marginBottom: 22,
  },
  date: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 18,
  },
  greeting: {
    fontSize: 10.5,
    color: DARK,
    marginBottom: 16,
  },
  greetingBold: {
    fontFamily: "Helvetica-Bold",
  },
  paragraph: {
    fontSize: 10.5,
    lineHeight: 1.55,
    color: BODY,
    marginBottom: 14,
  },
  signOff: {
    fontSize: 10.5,
    color: DARK,
    marginTop: 8,
  },
  signName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    color: DARK,
    marginTop: 18,
  },
});

function Wave() {
  return (
    <Svg
      width={260}
      height={130}
      style={{ position: "absolute", bottom: 0, right: 0 }}
    >
      <Path
        d="M0,90 C60,40 120,120 180,70 C210,45 240,55 260,30 L260,130 L0,130 Z"
        fill={NAVY}
        opacity={0.05}
      />
      <Path
        d="M40,110 C100,70 150,130 200,90 C225,70 245,80 260,60 L260,130 L40,130 Z"
        fill={NAVY}
        opacity={0.08}
      />
    </Svg>
  );
}

function CoverLetterDocument({
  text,
  company,
  contact,
}: {
  text: string;
  company: string;
  contact: { name: string; email: string; phone: string; location: string };
}) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const dateStr = format(new Date(), "MMMM d, yyyy");

  return (
    <Document title={`Cover Letter — ${company}`} author={contact.name}>
      <Page size="A4" style={s.page}>
        <View>
          <Text style={s.headerName}>{contact.name}</Text>
          <View style={s.headerContact}>
            <Text>{contact.email}</Text>
            <Text>{contact.phone}</Text>
            <Text>{contact.location}</Text>
          </View>
        </View>

        <View style={s.hr} />

        <Text style={s.date}>{dateStr}</Text>

        <Text style={s.greeting}>
          Dear <Text style={s.greetingBold}>{company} team</Text>
        </Text>

        {paragraphs.map((p, i) => (
          <Text key={i} style={s.paragraph}>
            {p}
          </Text>
        ))}

        <Text style={s.signOff}>Sincerely,</Text>
        <Text style={s.signName}>{contact.name}</Text>

        <Wave />
      </Page>
    </Document>
  );
}

export async function generateCoverLetterPdf(input: {
  text: string;
  company: string;
  contact: { name: string; email: string; phone: string; location: string };
}): Promise<Buffer> {
  return renderToBuffer(<CoverLetterDocument {...input} />);
}
