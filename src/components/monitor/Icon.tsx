import {
  ArrowLeft,
  Bug,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  Code,
  Copy,
  ExternalLink,
  DraftingCompass,
  Flag,
  Folder,
  Folders,
  History,
  Hourglass,
  Layers,
  Link2,
  ListTodo,
  LoaderCircle,
  Map,
  Maximize,
  Minus,
  MousePointer2,
  Network,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  SquareKanban,
  SquarePen,
  SquareUser,
  Timer,
  TriangleAlert,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  account_box: SquareUser,
  add: Plus,
  back: ArrowLeft,
  bug: Bug,
  architecture: DraftingCompass,
  avg_time: Timer,
  check: Check,
  close: X,
  code: Code,
  content_copy: Copy,
  delete: Trash2,
  open_in_new: ExternalLink,
  edit_note: SquarePen,
  expand_less: ChevronUp,
  expand_more: ChevronDown,
  fit_screen: Maximize,
  flag: Flag,
  folder: Folder,
  folder_copy: Folders,
  groups: Users,
  history: History,
  hourglass_top: Hourglass,
  hub: Network,
  layers: Layers,
  link: Link2,
  map: Map,
  cursor: MousePointer2,
  attach_file: Paperclip,
  pending_actions: ListTodo,
  person: User,
  progress_activity: LoaderCircle,
  refresh: RefreshCw,
  remove: Minus,
  restart_alt: RotateCcw,
  schedule: Clock,
  search: Search,
  settings: Settings,
  sync: RefreshCw,
  tune: SlidersHorizontal,
  view_kanban: SquareKanban,
  warning: TriangleAlert,
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return (
    <Glyph
      aria-hidden="true"
      size={size}
      strokeWidth={1.75}
      className={`inline-block shrink-0 select-none ${className ?? ""}`}
    />
  );
}
