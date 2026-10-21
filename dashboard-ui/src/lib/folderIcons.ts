import {
  Code2,
  Lightbulb,
  User,
  Briefcase,
  GraduationCap,
  FlaskConical,
  Folder,
  Heart,
  Rocket,
  BookOpen,
  Target,
  Wallet,
  Home,
  Plane,
  Music,
  Camera,
  type LucideIcon,
} from 'lucide-react';

// The selectable set in the icon picker. Keys are stored verbatim in
// folders.icon when a user explicitly picks one.
export const FOLDER_ICON_OPTIONS: Record<string, LucideIcon> = {
  code: Code2,
  idea: Lightbulb,
  person: User,
  work: Briefcase,
  learning: GraduationCap,
  research: FlaskConical,
  folder: Folder,
  heart: Heart,
  rocket: Rocket,
  book: BookOpen,
  target: Target,
  wallet: Wallet,
  home: Home,
  travel: Plane,
  music: Music,
  photo: Camera,
};

const DEFAULT_ICON_ORDER = Object.keys(FOLDER_ICON_OPTIONS);

// Folders created without an explicit icon (including everything the voice
// assistant creates) get a deterministic pick based on their name, so the
// same folder always looks the same without needing a stored default.
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function resolveFolderIcon(name: string, icon: string | null): LucideIcon {
  if (icon && FOLDER_ICON_OPTIONS[icon]) return FOLDER_ICON_OPTIONS[icon];
  const key = DEFAULT_ICON_ORDER[hashString(name) % DEFAULT_ICON_ORDER.length];
  return FOLDER_ICON_OPTIONS[key];
}
