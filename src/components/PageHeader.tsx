interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl md:text-4xl font-bold text-white">{title}</h1>
      {subtitle && (
        <p className="mt-2 text-netflix-light-gray text-lg">{subtitle}</p>
      )}
    </div>
  );
}
