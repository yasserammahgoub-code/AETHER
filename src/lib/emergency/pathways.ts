/**
 * Emergency pathways — ILLUSTRATIVE protocol set.
 *
 * Everything clinical lives here (symptoms, which measurements matter, checklist steps) so that a
 * Flight Surgeon-approved set can replace it without touching the engine or the UI: provide a
 * `ProtocolSet` with `meta.status: "approved"` and the "illustrative" labels disappear.
 *
 * Content rules (enforced by tests in engine.test.ts):
 *  - Steps are non-medical holding actions: stop, secure, call for help, measure, record, report.
 *  - No medication names, no doses, no instruction to take anything.
 *  - Every pathway tells the person NOT to take medication unless the Flight Surgeon directs it.
 *  - No condition names. AETHER never says what is wrong, only what was reported and who to involve.
 */
import type { Measurement, Pathway, PathwayId, ProtocolSet } from "./types";

const onset = (label = "When did it start?"): Measurement => ({
  kind: "choice",
  id: "onset",
  label,
  why: "Timing helps the Flight Surgeon.",
  options: [
    { id: "now", label: "Within the last 15 minutes" },
    { id: "hour", label: "Within the last hour" },
    { id: "day", label: "Within the last 24 hours" },
    { id: "longer", label: "Longer ago, or gradual" },
  ],
});

const step = {
  stop: () => ({
    id: "stop",
    text: "Stop what you are doing and settle into a stable, secured position.",
  }),
  crew: (detail = "A crew member should stay with you until the Flight Surgeon gives further direction.") => ({
    id: "crew",
    text: "Tell a crew member now, or use Request Crew Assistance. Do not stay alone.",
    detail,
  }),
  record: () => ({
    id: "record",
    text: "Note the time symptoms began and what you were doing.",
  }),
  surgeon: () => ({
    id: "surgeon",
    text: "Notify the Flight Surgeon using the button on this screen.",
    detail: "The report holds your selected symptoms, readings and completed steps. It contains no diagnosis.",
  }),
  noMeds: (detail?: string) => ({
    id: "no-meds",
    text: "Do not take any medication unless the Flight Surgeon directs you to.",
    detail,
  }),
};

const cardiovascular: Pathway = {
  id: "cardiovascular",
  title: "Cardiovascular warning",
  short: "Chest discomfort, heartbeat changes, fainting",
  icon: "heart",
  symptoms: [
    { id: "chest", label: "Chest pain, pressure or tightness", level: "immediate" },
    { id: "radiating", label: "Discomfort spreading to the arm, jaw, neck or back", level: "immediate" },
    { id: "faint", label: "Fainting or loss of consciousness", level: "immediate" },
    { id: "breath", label: "Shortness of breath with chest symptoms", level: "immediate" },
    { id: "racing", label: "Racing or pounding heartbeat", level: "urgent" },
    { id: "irregular", label: "Irregular heartbeat or skipped beats", level: "urgent" },
    { id: "lightheaded", label: "Lightheaded or close to fainting", level: "urgent" },
    { id: "sweat", label: "Unusual sweating or clammy skin" },
    { id: "nausea", label: "Nausea with chest discomfort" },
    { id: "fatigue", label: "Unusual fatigue or weakness" },
  ],
  measurements: [
    { kind: "param", id: "hr", parameterId: "hr", why: "Take it at rest with the approved sensor if you can." },
    { kind: "param", id: "bp", parameterId: "bp", why: "Seated or secured, arm at heart level." },
    { kind: "param", id: "spo2", parameterId: "spo2", why: "Use a warm, still fingertip." },
    { kind: "scale", id: "chest-scale", label: "Chest discomfort", lowLabel: "None", highLabel: "Severe", why: "Your own rating, right now." },
    {
      kind: "choice",
      id: "when",
      label: "When do the symptoms occur?",
      why: "Context for the Flight Surgeon.",
      options: [
        { id: "rest", label: "At rest", level: "urgent" },
        { id: "activity", label: "During or after activity" },
        { id: "unsure", label: "Not sure" },
      ],
    },
    onset(),
  ],
  checklist: [
    step.stop(),
    step.crew(),
    { id: "loosen", text: "Loosen tight clothing or restraints and keep your upper body supported." },
    {
      id: "measure",
      text: "Take heart rate, blood pressure and SpO₂ with the approved devices and enter them here.",
      detail: "If a reading fails or looks wrong, say so. Do not guess a number.",
    },
    step.record(),
    step.surgeon(),
    step.noMeds(),
    { id: "repeat", text: "Repeat measurements only as the Flight Surgeon directs, and log each result." },
  ],
};

const respiratory: Pathway = {
  id: "respiratory",
  title: "Respiratory problems",
  short: "Difficulty breathing, cough, cabin air concerns",
  icon: "lungs",
  symptoms: [
    { id: "rest", label: "Difficulty breathing at rest", level: "immediate" },
    { id: "sentence", label: "Cannot speak a full sentence without pausing", level: "immediate" },
    { id: "blue", label: "Blue or gray lips or fingertips", level: "immediate" },
    { id: "air", label: "Unusual smell, haze, or throat and eye irritation", level: "immediate" },
    { id: "tight", label: "Chest tightness", level: "urgent" },
    { id: "wheeze", label: "Wheezing or noisy breathing", level: "urgent" },
    { id: "fast", label: "Fast or shallow breathing", level: "urgent" },
    { id: "exertion", label: "Shortness of breath on exertion" },
    { id: "cough", label: "Persistent cough" },
    { id: "throat", label: "Sore or irritated throat" },
  ],
  measurements: [
    { kind: "param", id: "spo2", parameterId: "spo2", why: "Use a warm, still fingertip." },
    { kind: "param", id: "resp", parameterId: "resp", why: "Count for a full 60 seconds, at rest, without talking." },
    { kind: "param", id: "hr", parameterId: "hr", why: "At rest if you can." },
    { kind: "scale", id: "breath-scale", label: "Breathlessness", lowLabel: "None", highLabel: "Severe", why: "Your own rating, right now." },
    {
      kind: "choice",
      id: "when",
      label: "When is breathing difficult?",
      why: "Context for the Flight Surgeon.",
      options: [
        { id: "rest", label: "At rest", level: "urgent" },
        { id: "activity", label: "Only with activity" },
        { id: "unsure", label: "Not sure" },
      ],
    },
    onset(),
  ],
  checklist: [
    step.stop(),
    { id: "upright", text: "Stay upright and supported if you can, and breathe slowly." },
    step.crew(),
    {
      id: "cabin",
      text: "Ask the crew to check cabin air alarms and readings, and follow cabin emergency procedures if anything is abnormal.",
    },
    {
      id: "measure",
      text: "Measure SpO₂ and breathing rate with the approved devices and enter them here.",
    },
    step.record(),
    step.surgeon(),
    step.noMeds(),
    { id: "others", text: "Tell the crew right away if anyone else has symptoms." },
  ],
};

const infection: Pathway = {
  id: "infection",
  title: "Fever and possible infection",
  short: "Fever, chills, wounds, cough, feeling unwell",
  icon: "thermo",
  symptoms: [
    { id: "neck", label: "Stiff neck together with fever", level: "immediate" },
    { id: "confused", label: "Confusion or unusual drowsiness", level: "immediate" },
    { id: "breathing", label: "Difficulty breathing", level: "immediate" },
    { id: "wound", label: "A wound that is red, swollen, warm or draining", level: "urgent" },
    { id: "fluids", label: "Cannot keep fluids down", level: "urgent" },
    { id: "fever", label: "Feeling feverish or hot" },
    { id: "chills", label: "Chills or shivering" },
    { id: "rash", label: "Rash or spreading redness on the skin" },
    { id: "cough", label: "Cough or sore throat" },
    { id: "aches", label: "Body aches or unusual fatigue" },
    { id: "headache", label: "Headache" },
    { id: "gi", label: "Nausea, vomiting or diarrhea" },
  ],
  measurements: [
    { kind: "param", id: "temp", parameterId: "temp", why: "Use the approved thermometer, correctly placed." },
    { kind: "param", id: "hr", parameterId: "hr", why: "At rest if you can." },
    { kind: "param", id: "resp", parameterId: "resp", why: "Count for a full 60 seconds, at rest." },
    { kind: "param", id: "spo2", parameterId: "spo2", why: "Use a warm, still fingertip." },
    {
      kind: "choice",
      id: "others",
      label: "Do other crew members have similar symptoms?",
      why: "Affects how the crew shares air and surfaces.",
      options: [
        { id: "no", label: "No" },
        { id: "yes", label: "Yes", level: "urgent" },
        { id: "unsure", label: "Not sure" },
      ],
    },
    {
      kind: "choice",
      id: "duration",
      label: "How long have symptoms lasted?",
      why: "Context for the Flight Surgeon.",
      options: [
        { id: "short", label: "Under 6 hours" },
        { id: "mid", label: "6 to 24 hours" },
        { id: "long", label: "More than 24 hours" },
      ],
    },
  ],
  checklist: [
    { id: "rest", text: "Rest and reduce activity." },
    {
      id: "measure",
      text: "Measure body temperature with the approved thermometer and enter it here.",
    },
    { id: "contact", text: "Limit close contact with other crew where practical, and tell them you feel unwell." },
    { id: "hygiene", text: "Follow crew hygiene procedures for hands, wipes and shared surfaces." },
    { id: "drink", text: "Drink water normally unless the Flight Surgeon says otherwise." },
    step.record(),
    step.crew("Tell them even if you feel able to manage. Shared air makes this a crew matter."),
    step.surgeon(),
    step.noMeds("This includes anything for fever or pain. It can hide changes the Flight Surgeon needs to see."),
  ],
};

const neuro: Pathway = {
  id: "neuro",
  title: "Neurological and vision concerns",
  short: "Vision changes, severe headache, weakness, confusion",
  icon: "brain",
  symptoms: [
    { id: "vision-loss", label: "Sudden loss of vision or double vision", level: "immediate" },
    { id: "weak", label: "Weakness or numbness on one side of the body", level: "immediate" },
    { id: "speech", label: "Slurred speech or a drooping face", level: "immediate" },
    { id: "thunder", label: "Sudden, severe headache", level: "immediate" },
    { id: "confusion", label: "Confusion or trouble thinking clearly", level: "immediate" },
    { id: "seizure", label: "Seizure or loss of consciousness", level: "immediate" },
    { id: "blur", label: "Blurred vision, or a change in near or distance vision", level: "urgent" },
    { id: "eye-pain", label: "Eye pain or pressure", level: "urgent" },
    { id: "flashes", label: "Flashes of light or new floaters", level: "urgent" },
    { id: "balance", label: "Dizziness or loss of balance", level: "urgent" },
    { id: "headache", label: "Persistent headache" },
  ],
  measurements: [
    {
      kind: "choice",
      id: "start",
      label: "How did it start?",
      why: "Sudden onset matters to the Flight Surgeon.",
      options: [
        { id: "sudden", label: "Suddenly", level: "urgent" },
        { id: "gradual", label: "Gradually" },
        { id: "unsure", label: "Not sure" },
      ],
    },
    {
      kind: "choice",
      id: "eyes",
      label: "Which eye is affected?",
      why: "Only if your vision has changed.",
      options: [
        { id: "one", label: "One eye" },
        { id: "both", label: "Both eyes" },
        { id: "na", label: "No vision change" },
      ],
    },
    { kind: "scale", id: "headache-scale", label: "Headache intensity", lowLabel: "None", highLabel: "Severe", why: "Your own rating, right now." },
    { kind: "param", id: "bp", parameterId: "bp", why: "Seated or secured, arm at heart level." },
    { kind: "param", id: "hr", parameterId: "hr", why: "At rest if you can." },
    { kind: "param", id: "glucose", parameterId: "glucose", why: "A data point for the Flight Surgeon. AETHER does not interpret it." },
    onset(),
  ],
  checklist: [
    step.stop(),
    step.crew(),
    {
      id: "time",
      text: "Note the exact time symptoms started.",
      detail: "This time matters to the Flight Surgeon.",
    },
    {
      id: "observe",
      text: "Ask a crew member to watch for changes in your speech, face, vision or movement and report what they see.",
      detail: "Report observations only. Do not interpret them.",
    },
    {
      id: "measure",
      text: "Take blood pressure, heart rate and glucose with the approved devices and enter them here.",
    },
    { id: "avoid", text: "Avoid strenuous activity and sudden head movements." },
    step.surgeon(),
    step.noMeds(),
  ],
};

const behavioral: Pathway = {
  id: "behavioral",
  title: "Behavioral health crisis",
  short: "Distress, panic, feeling unsafe, conflict",
  icon: "mind",
  symptoms: [
    { id: "harm", label: "Thoughts of self-harm or of harming others", level: "immediate" },
    { id: "unsafe", label: "Not feeling safe", level: "immediate" },
    { id: "perceive", label: "Seeing or hearing things that others do not", level: "immediate" },
    { id: "agitation", label: "Severe agitation or anger that is hard to control", level: "urgent" },
    { id: "panic", label: "Panic or overwhelming anxiety", level: "urgent" },
    { id: "hopeless", label: "Hopelessness, or feeling unable to continue", level: "urgent" },
    { id: "nosleep", label: "Little or no sleep for more than a day, with racing thoughts", level: "urgent" },
    { id: "conflict", label: "Serious conflict with a crew member" },
    { id: "withdraw", label: "Withdrawing, or unable to carry out duties" },
    { id: "mood", label: "Persistent low mood or irritability" },
  ],
  measurements: [
    {
      kind: "choice",
      id: "safe",
      label: "Does the person feel safe right now?",
      why: "Asked so the right people are involved quickly.",
      options: [
        { id: "yes", label: "Yes" },
        { id: "unsure", label: "Not sure", level: "urgent" },
        { id: "no", label: "No", level: "immediate" },
      ],
    },
    { kind: "scale", id: "distress", label: "Level of distress", lowLabel: "None", highLabel: "Extreme", why: "Your own rating, right now." },
    { kind: "param", id: "sleep", parameterId: "sleep", why: "Hours slept in the last 24 hours." },
    { kind: "param", id: "hr", parameterId: "hr", why: "At rest if you can." },
    onset("When did this start?"),
  ],
  checklist: [
    {
      id: "quiet",
      text: "Move to a quiet place with a crew member you trust. Do not stay alone.",
    },
    {
      id: "tell",
      text: "Tell the crew how you are feeling. You do not need to explain everything.",
    },
    {
      id: "support",
      text: "If you are with a crew member in distress: stay with them, speak calmly, listen, and avoid arguing.",
    },
    {
      id: "safety",
      text: "If anyone may harm themselves or others, tell the crew now and keep that person from being alone.",
    },
    { id: "breathe", text: "Take slow breaths. Naming five things you can see can help you settle." },
    {
      id: "record",
      text: "Write down what happened: who, when, and what was said or done. Stick to facts.",
    },
    {
      id: "surgeon",
      text: "Notify the Flight Surgeon using the button on this screen.",
      detail: "The Flight Surgeon can involve behavioral health support.",
    },
    step.noMeds("This includes any other substance used to cope."),
  ],
};

const adaptation: Pathway = {
  id: "adaptation",
  title: "Space adaptation problems",
  short: "Motion sickness, dizziness, head fullness, vision change",
  icon: "orbit",
  symptoms: [
    { id: "loc", label: "Loss of consciousness", level: "immediate" },
    { id: "thunder", label: "Sudden, severe headache", level: "immediate" },
    { id: "vomiting", label: "Repeated vomiting, or cannot keep fluids down", level: "urgent" },
    { id: "near-faint", label: "Fainting or near-fainting when standing or moving", level: "urgent" },
    { id: "blur", label: "Blurred vision, or a change in near vision", level: "urgent" },
    { id: "nausea", label: "Nausea or motion sickness" },
    { id: "dizzy", label: "Dizziness or disorientation" },
    { id: "head", label: "Headache or a feeling of head fullness" },
    { id: "puffy", label: "Facial puffiness or nasal congestion" },
    { id: "back", label: "Back pain" },
    { id: "fatigue", label: "Unusual fatigue or poor sleep" },
    { id: "appetite", label: "Reduced appetite" },
    { id: "weak", label: "Muscle weakness or reduced exercise tolerance" },
  ],
  measurements: [
    {
      kind: "choice",
      id: "phase",
      label: "Where are you in the mission?",
      why: "Context for the Flight Surgeon.",
      options: [
        { id: "early", label: "First days in microgravity" },
        { id: "mid", label: "Later in the mission" },
        { id: "return", label: "Recently back in gravity" },
      ],
    },
    { kind: "scale", id: "nausea-scale", label: "Nausea", lowLabel: "None", highLabel: "Severe", why: "Your own rating, right now." },
    { kind: "param", id: "hr", parameterId: "hr", why: "At rest if you can." },
    { kind: "param", id: "bp", parameterId: "bp", why: "Seated or secured, arm at heart level." },
    { kind: "param", id: "sleep", parameterId: "sleep", why: "Hours slept in the last 24 hours." },
    onset(),
  ],
  checklist: [
    { id: "pause", text: "Pause and reduce sudden head and body movements. Secure yourself in a stable position." },
    { id: "bag", text: "Keep a waste bag within reach." },
    { id: "sip", text: "Sip water if you can. Tell the crew if you cannot keep fluids down." },
    step.crew(),
    { id: "measure", text: "Take heart rate and blood pressure with the approved devices, and enter your sleep hours." },
    step.record(),
    step.surgeon(),
    step.noMeds("This includes anything for motion sickness."),
  ],
};

export const ILLUSTRATIVE_PROTOCOLS: ProtocolSet = {
  meta: {
    id: "astra-emergency-illustrative",
    version: "0.1",
    status: "illustrative",
    label: "AETHER illustrative checklists v0.1",
    disclaimer:
      "Prototype placeholder steps. They are not a Flight Surgeon-approved protocol. Replace them with the approved checklists before any operational use.",
  },
  pathways: { cardiovascular, respiratory, infection, neuro, behavioral, adaptation } satisfies Record<PathwayId, Pathway>,
  order: ["cardiovascular", "respiratory", "infection", "neuro", "behavioral", "adaptation"],
};
