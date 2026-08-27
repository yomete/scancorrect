import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DropZone } from '../DropZone'

describe('DropZone', () => {
  const defaultProps = {
    isProcessing: false,
    onDragOver: vi.fn(),
    onDragLeave: vi.fn(),
    onDrop: vi.fn(),
    onFileSelect: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should render drop zone with supported formats text', () => {
      render(<DropZone {...defaultProps} />)

      expect(screen.getByText(/Supported: JPG, JPEG, TIFF/i)).toBeInTheDocument()
    })

    it('should not show processing spinner', () => {
      render(<DropZone {...defaultProps} />)

      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

  })

  describe('drag and drop events', () => {
    it('should call onDragOver when dragging over', () => {
      render(<DropZone {...defaultProps} />)

      const dropZone = screen.getByText(/Supported:/i).closest('div')?.parentElement
      expect(dropZone).toBeTruthy()

      fireEvent.dragOver(dropZone!)

      expect(defaultProps.onDragOver).toHaveBeenCalled()
    })

    it('should call onDragLeave when dragging out', () => {
      render(<DropZone {...defaultProps} />)

      const dropZone = screen.getByText(/Supported:/i).closest('div')?.parentElement
      fireEvent.dragLeave(dropZone!)

      expect(defaultProps.onDragLeave).toHaveBeenCalled()
    })

    it('should call onDrop when files are dropped', () => {
      render(<DropZone {...defaultProps} />)

      const dropZone = screen.getByText(/Supported:/i).closest('div')?.parentElement
      fireEvent.drop(dropZone!)

      expect(defaultProps.onDrop).toHaveBeenCalled()
    })

  })

  describe('click to select', () => {
    it('should call onFileSelect when clicked', () => {
      render(<DropZone {...defaultProps} />)

      const dropZone = screen.getByText(/Supported:/i).closest('div')?.parentElement
      fireEvent.click(dropZone!)

      expect(defaultProps.onFileSelect).toHaveBeenCalled()
    })
  })

  describe('processing state', () => {
    it('should show spinner when processing', () => {
      render(<DropZone {...defaultProps} isProcessing={true} />)

      // The spinner has animate-spin class
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should hide supported formats text when processing', () => {
      render(<DropZone {...defaultProps} isProcessing={true} />)

      expect(screen.queryByText(/Supported:/i)).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should have cursor-pointer class', () => {
      render(<DropZone {...defaultProps} />)

      const dropZone = screen.getByText(/Supported:/i).closest('div')?.parentElement
      expect(dropZone).toHaveClass('cursor-pointer')
    })

    it('should have transition classes', () => {
      render(<DropZone {...defaultProps} />)

      const dropZone = screen.getByText(/Supported:/i).closest('div')?.parentElement
      expect(dropZone).toHaveClass('transition-colors')
    })

  })
})
