import { Link } from 'react-router-dom';
import heroImage from '../assets/sport-hero.jpg';

const KEYWORDS = [
  'Sports Networking',
  'Social Platform',
  'Community Engagement',
  'User Experience',
  'Activity Invitations',
  'Sports Enthusiasts',
];

const SUBJECTS = [
  {
    title: 'Intuitive Experience',
    body: 'Design flows that feel natural for sporters, from discovery to post-activity reflection.',
  },
  {
    title: 'Social Matching',
    body: 'Build matchmaking and invitations that help sporters find partners who match their goals.',
  },
  {
    title: 'Activity Tracking',
    body: 'Craft dashboards and trackers that surface meaningful stats across different sports.',
  },
  {
    title: 'Data & Personalisation',
    body: 'Translate user preferences and behaviour into personalised journeys and recommendations.',
  },
  {
    title: 'Scalable Infrastructure',
    body: 'Engineer a resilient backbone that can grow with the SportConnect community.',
  },
];

const DELIVERABLES = [
  'A functional, live prototype of the SportConnect platform',
  'Project plan covering milestones and responsibilities',
  'Portfolio that showcases your process and outcomes',
  'Demo or presentation to tell the story and results',
];

export default function Home() {
  return (
    <>
      <section className="section hero" id="home">
        <div className="hero-copy">
          <p className="eyebrow">Digital community for sporters</p>
          <h2>Reignite sporting passion through connection</h2>
          <p className="lead">
            SportConnect X blends social networking principles with dedicated sports tooling so enthusiasts can find,
            invite, and train together. Shape a platform that makes discovering shared activities effortless and fun.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/activities">Explore activities</Link>
            <Link className="button ghost" to="/profile">Meet the community</Link>
          </div>
          <div className="hero-keywords">
            {KEYWORDS.slice(0, 4).map((keyword) => (
              <span key={keyword} className="chip ghost">{keyword}</span>
            ))}
          </div>
        </div>
        <div className="hero-media">
          <img
            src={heroImage}
            alt="Football teammates celebrating a win together"
            className="hero-image"
          />
          <div className="panel main-question">
            <span className="panel-label">Main question</span>
            <p>How can an online social platform enhance the way individual sporters connect and engage in sporting activities?</p>
          </div>
        </div>
      </section>

      <section id="context" className="section context">
        <div className="section-header">
          <span className="section-eyebrow">Why it matters</span>
          <h3>Reversing the decline in active lifestyles</h3>
        </div>
        <p>
          Over the past decades the percentage of people practicing an actual sport has decreased. By integrating technology
          and social networking principles a community where sports enthusiasts can find and engage with like-minded
          individuals for various sport activities can be created.
        </p>
      </section>

      <section className="section keywords">
        <div className="section-header">
          <span className="section-eyebrow">Keywords</span>
          <h3>Anchor the experience around these themes</h3>
        </div>
        <div className="chip-group">
          {KEYWORDS.map((keyword) => (
            <span key={keyword} className="chip">{keyword}</span>
          ))}
        </div>
      </section>

      <section className="section description">
        <div className="section-header">
          <span className="section-eyebrow">Project description</span>
          <h3>Build a social platform that keeps sporters moving</h3>
        </div>
        <p>
          The SportConnect project focuses on developing a social platform that facilitates connections between individual
          sporters for shared sporting activities. By integrating technology and social networking principles, this project
          will enhance the way sports enthusiasts find and engage with like-minded individuals for various sports activities.
        </p>
        <p>
          Different disciplines within the Field of IT can be combined, spanning hardware integrations and software
          development to data analytics, infrastructure, and experience design. The project invites tailor-made journeys as
          long as at least three IT topics are explored in depth through analysis, design, and realisation.
        </p>
      </section>

      <section id="subjects" className="section subjects">
        <div className="section-header">
          <span className="section-eyebrow">Subject pathways</span>
          <h3>Select the tracks that match your strengths</h3>
        </div>
        <div className="card-grid">
          {SUBJECTS.map((subject) => (
            <article key={subject.title} className="card">
              <h4>{subject.title}</h4>
              <p>{subject.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="deliverables" className="section deliverables">
        <div className="section-header">
          <span className="section-eyebrow">Possible product</span>
          <h3>Visualise the outcomes you&apos;ll showcase</h3>
        </div>
        <div className="card-grid compact">
          {DELIVERABLES.map((deliverable) => (
            <article key={deliverable} className="card pill-card">
              <p>{deliverable}</p>
            </article>
          ))}
        </div>
      </section>

    </>
  );
}

