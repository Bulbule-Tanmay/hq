import { notFound } from 'next/navigation';
import ModuleView from '../../../../components/ModuleView';
import { BY_SLUG } from '../../../../lib/modules';

export function generateMetadata({ params }) {
  const mod = BY_SLUG[params.slug];
  return { title: mod ? `${mod.name} · Tanmay HQ` : 'Tanmay HQ' };
}

export default function ModulePage({ params }) {
  if (!BY_SLUG[params.slug]) notFound();
  return <ModuleView slug={params.slug} />;
}
