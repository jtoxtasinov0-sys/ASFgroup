import { imageUrl } from '../lib/api';
import { pick } from '../lib/i18n';
import { haptic } from '../lib/telegram';
import { retryImage } from '../lib/image';

export default function Stories({ stories, lang, seen, onOpen }) {
  if (!stories.length) return null;

  return (
    <div className="stories">
      {stories.map((story, index) => (
        <button
          key={story.id}
          className="story"
          // Doirachalar ketma-ket "otilib" chiqadi
          style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
          onClick={() => {
            haptic();
            onOpen(index);
          }}
        >
          <div className={`story-ring${seen.includes(story.id) ? ' seen' : ''}`}>
            <img className="story-img" src={imageUrl(story.image, 320)} alt="" loading="lazy" decoding="async" onError={retryImage} />
          </div>
          <div className="story-title">{pick(story, 'title', lang)}</div>
        </button>
      ))}
    </div>
  );
}
