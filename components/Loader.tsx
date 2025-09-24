
import React from 'react';

const Loader: React.FC = () => (
  <div style={styles.loaderContainer}>
    <svg style={styles.spinner} viewBox="0 0 50 50">
      <circle style={styles.path} cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
    </svg>
    <p style={styles.loaderText}>Analyzing with Gemini AI...</p>
    <p style={styles.loaderSubtext}>This may take a moment for complex plans.</p>
  </div>
);

const styles: { [key: string]: React.CSSProperties } = {
  loaderContainer: {
    textAlign: 'center',
    color: '#4B5563',
  },
  spinner: {
    animation: 'rotate 2s linear infinite',
    width: '60px',
    height: '60px',
    marginBottom: '1rem',
  },
  path: {
    stroke: '#10B981',
    strokeLinecap: 'round',
    animation: 'dash 1.5s ease-in-out infinite',
  },
  loaderText: {
    fontSize: '1.125rem',
    fontWeight: 500,
    color: '#1F2937',
  },
  loaderSubtext: {
    fontSize: '0.875rem',
  },
};

const keyframes = `
  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }
  @keyframes dash {
    0% {
      stroke-dasharray: 1, 150;
      stroke-dashoffset: 0;
    }
    50% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -35;
    }
    100% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -124;
    }
  }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = keyframes;
document.head.appendChild(styleSheet);


export default Loader;
