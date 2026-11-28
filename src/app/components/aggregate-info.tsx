type SourceCategory = {
  id: string;
  name: string;
};

/** An aggregate category on the big screen before its reveal: what it adds up */
export function AggregateInfo({
  sourceCategories,
}: {
  sourceCategories: SourceCategory[];
}) {
  return (
    <div className="flex h-full flex-col justify-center gap-9">
      <p className="text-muted-foreground text-stage-lead font-medium">
        Adds up the results of
      </p>
      <ul className="flex flex-wrap gap-4">
        {sourceCategories.map(category => (
          <li
            key={category.id}
            className="bg-card text-card-foreground text-stage-body rounded-full px-7 py-3 font-semibold"
          >
            {category.name}
          </li>
        ))}
      </ul>
      <p className="text-stage-title font-bold">The results are next.</p>
    </div>
  );
}
