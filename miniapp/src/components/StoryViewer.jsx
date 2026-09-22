import { useEffect, useState } from 'react';
import { imageUrl } from '../lib/api';
import { pick } from '../lib/i18n';
import { haptic } from '../lib/telegram';

const DURATION = 5000;

export default function StoryViewer({ stories, startIndex, lang, t, onClose, onSeen, onProduct }) {
  const [index, setIndex] = useState(startIndex);
  const story = stories[index];

  // Avtomatik keyingisiga o'tish
  useEffect(() => {
    if (!story) return undefined;
    onSeen(story.id);
    const timer = setTimeout(() => {
      if (index < stories.length - 1) setIndex(index + 1);
      else onClose();
    }, DURATION);
    return () => clearTimeout(timer);
  }, [index, story, stories.length, onClose, onSeen]);

  if (!story) return null;

  const prev = () => {
    haptic();
    if (index > 0) setIndex(index - 1);
    else onClose();
  };

  const next = () => {
    haptic();
    if (index < stories.length - 1) setIndex(index + 1);
    else onClose();
  };

  return (
    <div className="viewer">
      <div className="viewer-bars">
        {stories.map((s, i) => (
          <div key={s.id} className="viewer-bar">
            <span className={i < index ? 'done' : i === index ? 'run' : ''} />
          </div>
        ))}
      </div>

      <div className="viewer-top">
        <img src="/logo.png" alt="" />
        <b>ASF GROUP</b>
        <button className="viewer-close" onClick={onClose} aria-label={t.close}>
          ×
        </button>
      </div>

      <div className="viewer-body">
        <img src={imageUrl(story.image)} alt={pick(story, 'title', lang)} />
        <div className="viewer-zone left" onClick={prev} />
        <div className="viewer-zone right" onClick={next} />
      </div>

      {story.productId ? (
        <div className="viewer-cta">
          <button onClick={() => onProduct(story.productId)}>
            {pick(story, 'title', lang)} →
          </button>
        </div>
      ) : (
        <div className="viewer-cta" />
      )}
    </div>
  );
}
