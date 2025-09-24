
import React, { useState, useCallback } from 'react';
import { AnalysisResult } from './types';
import { analyzeImage } from './services/geminiService';
import { UploadIcon, LeafIcon, ErrorIcon } from './components/IconComponents';
import Loader from './components/Loader';
import * as pdfjs from 'pdfjs-dist';

// Set the worker source for pdf.js. This is crucial for it to work in a web environment.
pdfjs.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@4.4.179/build/pdf.worker.mjs`;

const App: React.FC = () => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const categoryColors: { [key: string]: string } = {
    TREES_AND_SHRUBS: '#22C55E', // green-500
    GREEN_OPEN_SPACE: '#84CC16', // lime-500
    PERMEABLE_SURFACES: '#F97316', // orange-500
    IMPERMEABLE_SURFACES: '#71717A', // zinc-500
    INCIDENTAL_PLAY_AREA: '#3B82F6', // blue-500
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit for PDFs and images
        setError("File is too large. Please upload a file under 10MB.");
        return;
    }
    setOriginalFile(file);
    setResults(null);
    setError(null);
    setIsProcessingFile(true);
    setPreviewImage(null);

    const fileType = file.type;

    if (fileType === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (!e.target?.result) throw new Error("File could not be read.");
          const typedArray = new Uint8Array(e.target.result as ArrayBuffer);
          const pdfDoc = await pdfjs.getDocument(typedArray).promise;
          const page = await pdfDoc.getPage(1); // Get the first page
          const viewport = page.getViewport({ scale: 2.0 }); // Render at 2x scale for better quality

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Could not get canvas context');
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport }).promise;
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95); // Use JPEG for smaller size
          setPreviewImage(dataUrl);

        } catch (pdfError) {
          console.error("Error processing PDF: ", pdfError);
          setError("Failed to render PDF. The file might be corrupted or unsupported.");
        } finally {
          setIsProcessingFile(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read the PDF file.");
        setIsProcessingFile(false);
      };
      reader.readAsArrayBuffer(file);
    } else if (fileType.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
        setIsProcessingFile(false);
      };
      reader.onerror = () => {
        setError("Failed to read the image file.");
        setIsProcessingFile(false);
      };
      reader.readAsDataURL(file);
    } else {
      setError("Unsupported file type. Please upload a PDF, JPEG, PNG, or WEBP file.");
      setIsProcessingFile(false);
    }
  };

  const handleAnalyzeClick = useCallback(async () => {
    if (!previewImage || !originalFile) return;

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const base64Data = previewImage.split(',')[1];
      const mimeType = previewImage.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
      const analysisResults = await analyzeImage(base64Data, mimeType);
      
      const sortedResults = analysisResults.sort((a, b) => b.percentage - a.percentage);
      setResults(sortedResults);

    } catch (e) {
      console.error(e);
      setError("Failed to analyze the image. The model may be unable to process this file. Please try another image or check the console for details.");
    } finally {
      setIsLoading(false);
    }
  }, [previewImage, originalFile]);
  
  const totalPercentage = results?.reduce((sum, item) => sum + item.percentage, 0) || 0;

  const renderWelcomeScreen = () => (
    <div style={styles.welcomeContainer}>
      <div style={styles.welcomeContent}>
        <div style={styles.welcomeIcon}>
          <LeafIcon />
        </div>
        <h1 style={styles.welcomeTitle}>Urban Greening Factor Analyzer</h1>
        <p style={styles.welcomeSubtitle}>Upload a landscape masterplan (PDF/Image) to automatically classify and quantify its greening features using AI.</p>
        <label style={styles.uploadButton}>
          <UploadIcon />
          <span>Upload Masterplan</span>
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>
      </div>
    </div>
  );

  const renderAnalysisScreen = () => (
     <div style={styles.mainContainer}>
      <aside style={styles.sidebar}>
        <h1 style={styles.sidebarTitle}>Greening Analysis</h1>
        <div style={styles.imagePreviewContainer}>
            {isProcessingFile ? (
              <div style={styles.processingOverlay}>Processing File...</div>
            ) : (
              previewImage && <img src={previewImage} alt="Masterplan Preview" style={styles.imagePreview} />
            )}
        </div>
        <div style={styles.buttonGroup}>
             <label style={styles.reuploadButton}>
                <UploadIcon />
                <span>Change File</span>
                <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
            <button onClick={handleAnalyzeClick} disabled={isLoading || isProcessingFile || !previewImage} style={isLoading || isProcessingFile || !previewImage ? {...styles.analyzeButton, ...styles.buttonDisabled} : styles.analyzeButton}>
                {isLoading ? 'Analyzing...' : 'Analyze Plan'}
            </button>
        </div>

        {error && (
            <div style={styles.errorBox}>
                <ErrorIcon />
                <p style={styles.errorText}>{error}</p>
            </div>
        )}
      </aside>
      <main style={styles.mainContent}>
        {isLoading && <Loader />}
        {!isLoading && results && (
            <div style={styles.resultsContainer}>
                <h2 style={styles.resultsTitle}>Analysis Results</h2>
                <p style={styles.resultsSubtitle}>AI-powered classification of surface covers based on your masterplan.</p>
                
                <div style={styles.chartContainer}>
                    <div style={styles.stackedBar}>
                        {results.map(item => (
                            <div key={item.category} style={{...styles.barSegment, width: `${item.percentage}%`, backgroundColor: categoryColors[item.category] || '#CCCCCC' }} title={`${item.category.replace(/_/g, ' ')}: ${item.percentage}%`}></div>
                        ))}
                    </div>
                     <div style={styles.totalPercentageLabel}>
                        Total Calculated: {totalPercentage.toFixed(1)}%
                    </div>
                </div>

                <div style={styles.legendAndTableGrid}>
                    {results.map((item) => (
                        <div key={item.category} style={styles.resultCard}>
                           <div style={styles.cardHeader}>
                                <div style={{...styles.colorSwatch, backgroundColor: categoryColors[item.category] || '#CCCCCC'}}></div>
                                <h3 style={styles.cardTitle}>{item.category.replace(/_/g, ' ')}</h3>
                                <span style={styles.cardPercentage}>{item.percentage.toFixed(1)}%</span>
                           </div>
                           <p style={styles.cardDescription}>{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}
         {!isLoading && !results && (
            <div style={styles.placeholder}>
                <LeafIcon color="#D1D5DB"/>
                <h2 style={styles.placeholderTitle}>Ready for Analysis</h2>
                <p style={styles.placeholderText}>Click "Analyze Plan" to process the uploaded masterplan.</p>
            </div>
        )}
      </main>
    </div>
  );

  return (
    <div style={styles.appContainer}>
      {!previewImage && !isProcessingFile ? renderWelcomeScreen() : renderAnalysisScreen()}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  appContainer: {
    fontFamily: '"Inter", sans-serif',
    backgroundColor: '#F9FAFB', // gray-50
    minHeight: '100vh',
    display: 'flex',
    color: '#1F2937', // gray-800
  },
  welcomeContainer: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '2rem',
  },
  welcomeContent: {
    maxWidth: '600px',
  },
  welcomeIcon: {
      backgroundColor: '#ECFDF5', // green-50
      color: '#10B981', // emerald-500
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 32px',
  },
  welcomeTitle: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#111827', // gray-900
    marginBottom: '1rem',
  },
  welcomeSubtitle: {
    fontSize: '1.125rem',
    color: '#4B5563', // gray-600
    marginBottom: '2.5rem',
    lineHeight: '1.6',
  },
  uploadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: '#10B981', // emerald-500
    color: 'white',
    padding: '1rem 2rem',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  mainContainer: {
    display: 'flex',
    width: '100%',
    height: '100vh',
  },
  sidebar: {
    width: '380px',
    backgroundColor: 'white',
    borderRight: '1px solid #E5E7EB', // gray-200
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  sidebarTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '1.5rem',
    color: '#111827',
  },
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: '16 / 10',
    backgroundColor: '#F3F4F6', // gray-100
    borderRadius: '0.5rem',
    overflow: 'hidden',
    marginBottom: '1.5rem',
    border: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  processingOverlay: {
    color: '#4B5563',
    fontWeight: 500
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  reuploadButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #D1D5DB', // gray-300
    padding: '0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  analyzeButton: {
    flex: 1.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB', // gray-300
    cursor: 'not-allowed',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    backgroundColor: '#FEF2F2', // red-50
    color: '#B91C1C', // red-700
    padding: '1rem',
    borderRadius: '0.5rem',
    marginTop: 'auto'
  },
  errorText: {
    margin: 0,
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
  mainContent: {
    flex: 1,
    padding: '2.5rem',
    overflowY: 'auto',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    width: '100%',
    maxWidth: '900px',
  },
  resultsTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#111827',
  },
  resultsSubtitle: {
    fontSize: '1.125rem',
    color: '#4B5563',
    marginTop: '-0.5rem',
    marginBottom: '2rem',
  },
  chartContainer: {
    marginBottom: '2.5rem',
  },
  stackedBar: {
    display: 'flex',
    width: '100%',
    height: '24px',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  barSegment: {
    height: '100%',
    transition: 'width 0.5s ease-in-out',
  },
  totalPercentageLabel: {
    textAlign: 'right',
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: '#4B5563',
    fontWeight: 500
  },
  legendAndTableGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
  },
  resultCard: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      border: '1px solid #E5E7EB',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  colorSwatch: {
    width: '16px',
    height: '16px',
    borderRadius: '0.25rem',
  },
  cardTitle: {
      margin: 0,
      fontSize: '1rem',
      fontWeight: 600,
      color: '#111827',
      flex: 1,
  },
  cardPercentage: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#10B981',
  },
  cardDescription: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#4B5563',
    lineHeight: 1.6,
  },
  placeholder: {
      textAlign: 'center',
      color: '#9CA3AF', // gray-400
  },
  placeholderTitle: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#4B5563',
      marginTop: '1.5rem',
  },
  placeholderText: {
      fontSize: '1rem',
      color: '#6B7280',
  }
};

export default App;
