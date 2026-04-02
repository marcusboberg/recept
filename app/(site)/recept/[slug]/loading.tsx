export default function RecipeLoading() {
  return (
    <div className="recipe-shell recipe-shell--loading">
      <div className="recipe-mobile-only recipe-mobile-simple">
        <div className="recipe-cover__media2 recipe-cover__media2--loading">
          <div className="public-skeleton public-skeleton--hero" />
          <section className="recipe-mobile-main">
            <div className="recipe-mobile-content">
              <div className="public-skeleton public-skeleton--toggle" />
              <div className="recipe-loading-list">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="public-skeleton public-skeleton--line" />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
