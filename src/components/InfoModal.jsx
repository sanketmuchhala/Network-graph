import React from 'react';

const InfoModal = ({ topic, onClose }) => {
  const staticContent = {
    degrees: {
      title: "Degrees of Separation",
      sections: [
        {
          heading: "What does this mean?",
          text: "Degrees of separation measures the average number of 'hops' needed to get from any airport to any other airport in the network. If the average is 2.5, it means you can reach any destination with about 2-3 flights (including connections)."
        },
        {
          heading: "Why is this remarkable?",
          text: "Despite having 120 airports spread across the continental US, the network is incredibly well-connected. This is a real-world example of the 'small world' phenomenon – even large networks can have short paths between any two points."
        },
        {
          heading: "The Math Behind It",
          text: "We calculate this by finding the shortest path between every pair of airports using breadth-first search (BFS), then averaging all those path lengths. The low number shows how efficiently the hub-and-spoke model connects the country."
        }
      ]
    },
    hubs: {
      title: "Why Are Hubs Important?",
      sections: [
        {
          heading: "Preferential Attachment",
          text: "Hubs emerge through a process called 'preferential attachment' – when airlines add new routes, they preferentially connect to airports that are already well-connected. This creates a 'rich get richer' effect, leading to super-connected hubs."
        },
        {
          heading: "Efficiency vs. Vulnerability",
          text: "Hubs make networks incredibly efficient – they dramatically reduce the number of routes needed to connect every city. However, they also create single points of failure. Disrupting a major hub cascades throughout the network."
        },
        {
          heading: "Real-World Impact",
          text: "In reality, airports like Atlanta (ATL), Chicago (ORD), and Dallas (DFW) handle massive passenger volumes. Weather or operational issues at these hubs can delay thousands of flights nationwide."
        }
      ]
    },
    clustering: {
      title: "Clustering Coefficient",
      sections: [
        {
          heading: "What is clustering?",
          text: "The clustering coefficient measures: 'Of all the airports connected to Airport X, what fraction are also connected to each other?' It's like asking: 'Do my friends know each other?'"
        },
        {
          heading: "High Clustering",
          text: "High clustering indicates tight-knit regional networks. For example, airports in the Northeast might all connect to each other directly, forming a dense mesh. This provides redundancy and more direct routing options."
        },
        {
          heading: "Low Clustering at Hubs",
          text: "Major hubs often have LOW clustering – they connect many airports that don't connect to each other. This is the essence of hub-and-spoke: spoke cities connect through the hub, not directly to each other."
        }
      ]
    }
  };

  // Handle dynamic content (from AI insights)
  if (topic && typeof topic === 'object' && topic.title && topic.content) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-content-wide" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>×</button>
          <h2>{topic.title}</h2>
          <div className="modal-markdown">
            {topic.content.split('\n').map((line, idx) => {
              // Parse markdown-style formatting
              if (line.startsWith('## ')) {
                return <h3 key={idx} style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: 600 }}>{line.replace('## ', '')}</h3>;
              } else if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={idx} style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{line.replace(/\*\*/g, '')}</p>;
              } else if (line.startsWith('- **')) {
                const match = line.match(/- \*\*(.+?):\*\* (.+)/);
                if (match) {
                  return <p key={idx} style={{ marginBottom: '0.5rem', paddingLeft: '1rem' }}><strong>{match[1]}:</strong> {match[2]}</p>;
                }
              } else if (line.startsWith('- ')) {
                return <p key={idx} style={{ marginBottom: '0.5rem', paddingLeft: '1rem' }}>• {line.replace('- ', '')}</p>;
              } else if (line.match(/^\d+\./)) {
                return <p key={idx} style={{ marginBottom: '0.5rem', paddingLeft: '1rem' }}>{line}</p>;
              } else if (line.startsWith('```')) {
                return null; // Skip code fence markers
              } else if (line.trim() === '') {
                return <div key={idx} style={{ height: '0.5rem' }} />;
              } else {
                return <p key={idx} style={{ marginBottom: '0.5rem' }}>{line}</p>;
              }
              return null;
            })}
          </div>
          <button className="modal-close-btn" onClick={onClose}>Got it!</button>
        </div>
      </div>
    );
  }

  // Handle static content
  const info = staticContent[topic];
  if (!info) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>{info.title}</h2>
        {info.sections.map((section, index) => (
          <div key={index} className="modal-section">
            <h3>{section.heading}</h3>
            <p>{section.text}</p>
          </div>
        ))}
        <button className="modal-close-btn" onClick={onClose}>Got it!</button>
      </div>
    </div>
  );
};

export default InfoModal;
