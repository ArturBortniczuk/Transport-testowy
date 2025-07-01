// src/app/layout.js
import { Inter } from 'next/font/google'
import './globals.css'

// Import komponentów
let Header
try {
  Header = require('@/components/Header').default
} catch (error) {
  console.warn('Header component not found, using fallback')
  Header = () => (
    <header className="bg-white border-b border-gray-200 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900">Transport Manager</h1>
      </div>
    </header>
  )
}

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'System Zarządzania Transportem',
  description: 'Kompleksowy system zarządzania transportem i kurierami',
  keywords: 'transport, kurier, DHL, zarządzanie, logistyka',
  authors: [{ name: 'Transport System' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pl" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        {/* Error Boundary Fallback */}
        <ErrorBoundary>
          <div className="min-h-full flex flex-col">
            {/* Header */}
            <Header />
            
            {/* Main Content */}
            <main className="flex-1">
              <div className="h-full">
                {children}
              </div>
            </main>
            
            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
              <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <div className="text-sm text-gray-500">
                    © {new Date().getFullYear()} System Zarządzania Transportem. Wszystkie prawa zastrzeżone.
                  </div>
                  <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                    <span className="text-xs text-gray-400">
                      v2.0.0
                    </span>
                    <span className="text-xs text-gray-400">
                      Node.js {typeof process !== 'undefined' && process.version}
                    </span>
                    <StatusIndicator />
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </ErrorBoundary>

        {/* Global Scripts and Styles */}
        <GlobalErrorHandler />
      </body>
    </html>
  )
}

// Error Boundary Component
function ErrorBoundary({ children }) {
  const [hasError, setHasError] = React.useState(false)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    const handleError = (event) => {
      console.error('Global error caught:', event.error)
      setError(event.error)
      setHasError(true)
    }

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      setError(event.reason)
      setHasError(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError)
      window.addEventListener('unhandledrejection', handleUnhandledRejection)

      return () => {
        window.removeEventListener('error', handleError)
        window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      }
    }
  }, [])

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Wystąpił błąd aplikacji
          </h1>
          <p className="text-gray-600 text-center mb-4">
            Przepraszamy, coś poszło nie tak. Spróbuj odświeżyć stronę.
          </p>
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mb-4">
              <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                Szczegóły błędu (rozwój)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {error.toString()}
              </pre>
            </details>
          )}
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setHasError(false)
                setError(null)
              }}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              Spróbuj ponownie
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
            >
              Odśwież stronę
            </button>
          </div>
        </div>
      </div>
    )
  }

  return children
}

// Status Indicator Component
function StatusIndicator() {
  const [status, setStatus] = React.useState('checking')

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          credentials: 'include'
        })
        setStatus(response.ok ? 'online' : 'warning')
      } catch (error) {
        setStatus('offline')
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'offline':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Online'
      case 'warning':
        return 'Ostrzeżenia'
      case 'offline':
        return 'Offline'
      default:
        return 'Sprawdzanie...'
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-xs text-gray-500">{getStatusText()}</span>
    </div>
  )
}

// Global Error Handler
function GlobalErrorHandler() {
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Console error styling w development
      if (process.env.NODE_ENV === 'development') {
        const originalError = console.error
        console.error = (...args) => {
          originalError.apply(console, [
            '%c🚨 ERROR:',
            'color: red; font-weight: bold; font-size: 14px;',
            ...args
          ])
        }

        const originalWarn = console.warn
        console.warn = (...args) => {
          originalWarn.apply(console, [
            '%c⚠️ WARNING:',
            'color: orange; font-weight: bold; font-size: 14px;',
            ...args
          ])
        }
      }

      // Performance monitoring
      if ('performance' in window && 'navigation' in performance) {
        setTimeout(() => {
          const perfData = performance.getEntriesByType('navigation')[0]
          if (perfData) {
            console.log(
              '%c⚡ Performance:',
              'color: blue; font-weight: bold;',
              {
                loadTime: Math.round(perfData.loadEventEnd - perfData.fetchStart),
                domReady: Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart),
                type: perfData.type
              }
            )
          }
        }, 1000)
      }
    }
  }, [])

  return null
}

// Import React for hooks
const React = require('react')
