export default function SiteLoading() {
  return (
    <div className="page-shell space-y-6 home-landing home-loading">
      <header className="home-hero">
        <div className="home-hero__title-row">
          <div className="public-skeleton public-skeleton--title" />
        </div>
        <div className="home-hero__nav">
          <div className="home-hero__links">
            <div className="home-hero__search">
              <div className="public-skeleton public-skeleton--input" />
            </div>
          </div>
          <div className="public-skeleton public-skeleton--button" />
        </div>
      </header>

      <div className="category-group-row">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="category-group-card category-group-card--skeleton">
            <div className="public-skeleton public-skeleton--card-label" />
            <div className="public-skeleton public-skeleton--card-cta" />
          </div>
        ))}
      </div>

      <div className="recipe-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <article key={index} className="recipe-card recipe-card--skeleton">
            <div className="public-skeleton public-skeleton--media" />
            <div className="recipe-card__overlay recipe-card__overlay--center">
              <div className="recipe-card__titleblock">
                <div className="public-skeleton public-skeleton--recipe-title" />
                <div className="public-skeleton public-skeleton--recipe-subtitle" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
