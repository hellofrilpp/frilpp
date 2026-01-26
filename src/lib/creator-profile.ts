export type CreatorProfileSnapshot = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  address1?: string | null;
  city?: string | null;
  province?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type RequiredField = {
  key: string;
  label: string;
  isMissing: (creator: CreatorProfileSnapshot) => boolean;
};

const REQUIRED_FIELDS: RequiredField[] = [
  { key: "fullName", label: "Full name", isMissing: (c) => !c.fullName?.trim() },
  { key: "email", label: "Email", isMissing: (c) => !c.email?.trim() },
  { key: "phone", label: "Phone", isMissing: (c) => !c.phone?.trim() },
  { key: "address1", label: "Address", isMissing: (c) => !c.address1?.trim() },
  { key: "city", label: "City", isMissing: (c) => !c.city?.trim() },
  { key: "province", label: "State", isMissing: (c) => !c.province?.trim() },
  { key: "zip", label: "ZIP", isMissing: (c) => !c.zip?.trim() },
  { key: "location", label: "Location", isMissing: (c) => c.lat == null || c.lng == null },
];

export function getCreatorProfileMissingFields(creator: CreatorProfileSnapshot) {
  return REQUIRED_FIELDS.filter((field) => field.isMissing(creator)).map((field) => field.label);
}

export function isCreatorProfileComplete(creator: CreatorProfileSnapshot) {
  return getCreatorProfileMissingFields(creator).length === 0;
}
