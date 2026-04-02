'use client';

import Image from 'next/image';

interface TitleSegment {
  text: string;
  size: 'big' | 'small';
}

interface Props {
  editStatus: string | null;
  heroImage: string;
  isQuickEditing: boolean;
  onBack: () => void;
  onEdit: () => void;
  onShare: () => void;
  shareStatus: string | null;
  title: string;
  titleSegments: TitleSegment[];
}

export function RecipeMobileHero({
  editStatus,
  heroImage,
  isQuickEditing,
  onBack,
  onEdit,
  onShare,
  shareStatus,
  title,
  titleSegments,
}: Props) {
  return (
    <section className="recipe-cover">
      <div className="recipe-cover__media">
        <Image src={heroImage} alt={title} fill sizes="100vw" priority className="recipe-cover__image" />
      </div>
      <div className="recipe-cover__overlay">
        <button type="button" className="back-button back-button--mobile-icon" onClick={onBack} aria-label="Tillbaka">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        </button>
        {!isQuickEditing ? (
          <button
            type="button"
            className="recipe-edit-button recipe-edit-button--mobile"
            onClick={onEdit}
            aria-label="Redigera recept"
            title="Redigera recept"
          >
            <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          className="recipe-share-button recipe-share-button--mobile"
          onClick={onShare}
          aria-label="Dela recept"
          title="Dela recept"
        >
          <i className="fa-solid fa-arrow-up-from-bracket" aria-hidden="true" />
        </button>
        <div className="recipe-cover__summary">
          <div className="recipe-cover__title">
            {titleSegments.map((segment, idx) =>
              segment.size === 'big' ? (
                <div key={idx} className="recipe-cover__title-main recipe-title-segment recipe-title-segment--big">
                  {segment.text}
                </div>
              ) : (
                <div key={idx} className="recipe-cover__title-small recipe-title-segment recipe-title-segment--small">
                  {segment.text}
                </div>
              ),
            )}
          </div>
          {shareStatus ? <div className="recipe-share-feedback recipe-share-feedback--mobile">{shareStatus}</div> : null}
          {editStatus ? <div className="recipe-share-feedback recipe-share-feedback--mobile">{editStatus}</div> : null}
        </div>
      </div>
    </section>
  );
}
