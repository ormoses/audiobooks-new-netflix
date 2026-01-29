import PageHeader from '@/components/PageHeader';
import NeedsRatingList from '@/components/NeedsRatingList';

export default function NeedsRatingPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Needs Rating"
        subtitle="Books you've finished that need ratings"
      />

      <NeedsRatingList />
    </div>
  );
}
