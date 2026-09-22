import { imageUrl } from '../lib/api';
import { pick } from '../lib/i18n';
import { haptic } from '../lib/telegram';

export default function Stories({ stories, lang, seen, onOpen }) {
  if (!stories.length) return null;

  return (
    <div className="stories">
      {stories.map((story, index) => (
        <button
          key={story.id}
          className="story"
          onClick={() => {
            haptic();
            onOpen(index);
          }}
        >
          <div className={`story-ring${seen.includes(story.id) ? ' seen' : ''}`}>
            <img className="story-img" src={imageUrl(story.image)} alt="" loading="lazy" />
          </div>
          <div className="story-title">{pick(story, 'title', lang)}</div>
        </button>
      ))}
    </div>
  );
}
