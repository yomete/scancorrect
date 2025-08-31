import React from 'react'
import ReactDOM from 'react-dom/client'

function SimpleApp() {
  return <h1>Hello React!</h1>
}

const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(<SimpleApp />)
} else {
  console.error('Root element not found!')
}