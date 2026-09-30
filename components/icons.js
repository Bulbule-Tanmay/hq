'use client';

import {
  UserCircle, Scales, Target, Path, GraduationCap, Exam, TreeStructure, Stack, RocketLaunch,
  Briefcase, Trophy, CurrencyInr, Handshake, VideoCamera, Package, Lightbulb, ChartLineUp,
  Barbell, ForkKnife, Sparkle, Moon, DeviceMobile, CalendarCheck, Megaphone, CastleTurret,
  House, Plus, Trash, PencilSimple, Check, X, ArrowSquareOut, List, SignOut, Lock, Warning,
  MagnifyingGlass, CaretRight, ArrowClockwise, Crosshair,
} from '@phosphor-icons/react';

const MAP = {
  profile: UserCircle, priorities: Scales, targets: Target, roadmap: Path,
  academics: GraduationCap, gate: Exam, dsa: TreeStructure, skills: Stack,
  projects: RocketLaunch, internships: Briefcase, hackathons: Trophy,
  money: CurrencyInr, clients: Handshake, ugc: VideoCamera, products: Package, ideas: Lightbulb, investing: ChartLineUp,
  fitness: Barbell, nutrition: ForkKnife, appearance: Sparkle, sleep: Moon, screen: DeviceMobile, chess: CastleTurret,
  planner: CalendarCheck, social: Megaphone,
};

export function Icon({ name, size = 20, weight = 'regular' }) {
  const C = MAP[name] || Stack;
  return <C size={size} weight={weight} aria-hidden="true" />;
}

export const UI = {
  House, Plus, Trash, Pencil: PencilSimple, Check, X, Open: ArrowSquareOut, Menu: List,
  SignOut, Lock, Warning, Search: MagnifyingGlass, Caret: CaretRight, Refresh: ArrowClockwise, Focus: Crosshair,
};
