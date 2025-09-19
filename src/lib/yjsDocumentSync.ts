import * as Y from 'yjs';

interface DocumentSyncOptions {
  documentId: string;
  userId: string;
  onSendUpdate: (update: Uint8Array) => void;
  onAwarenessUpdate?: (awareness: Uint8Array) => void;
}

export class YjsDocumentSync {
  private doc: Y.Doc;
  private documentId: string;
  private userId: string;
  private onSendUpdate: (update: Uint8Array) => void;
  private onAwarenessUpdate?: (awareness: Uint8Array) => void;
  private text: Y.Text;
  
  // Awareness for user presence (cursors, selections)
  private awareness: Map<string, { 
    user: { name: string; color: string; id: string };
    cursor?: { line: number; column: number };
    selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
  }>;

  constructor(options: DocumentSyncOptions) {
    this.doc = new Y.Doc();
    this.documentId = options.documentId;
    this.userId = options.userId;
    this.onSendUpdate = options.onSendUpdate;
    this.onAwarenessUpdate = options.onAwarenessUpdate;
    
    // Get the shared text type - this is what the editor will bind to
    this.text = this.doc.getText('content');
    
    // Initialize awareness for user presence
    this.awareness = new Map();
    
    // Set up document update handler
    this.doc.on('update', this.handleDocumentUpdate.bind(this));
    
    console.log(`YjsDocumentSync initialized for document: ${this.documentId}`);
  }

  /**
   * Handle local document updates and send them to other clients
   */
  private handleDocumentUpdate(update: Uint8Array, origin: unknown) {
    // Don't broadcast updates that came from remote clients
    if (origin !== 'remote') {
      console.log('Sending document update to other clients');
      this.onSendUpdate(update);
    }
  }

  /**
   * Apply remote updates to the local document
   */
  public applyRemoteUpdate(update: Uint8Array): void {
    try {
      // Apply the update with 'remote' origin to prevent echo
      Y.applyUpdate(this.doc, update, 'remote');
      console.log('Applied remote document update');
    } catch (error) {
      console.error('Error applying remote update:', error);
    }
  }

  /**
   * Get the current document state as an update
   */
  public getDocumentState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  /**
   * Apply initial document state (for when joining an existing document)
   */
  public applyInitialState(state: Uint8Array): void {
    try {
      Y.applyUpdate(this.doc, state, 'remote');
      console.log('Applied initial document state');
    } catch (error) {
      console.error('Error applying initial state:', error);
    }
  }

  /**
   * Get the shared text object for editor binding
   */
  public getSharedText(): Y.Text {
    return this.text;
  }

  /**
   * Get the Yjs document
   */
  public getDocument(): Y.Doc {
    return this.doc;
  }

  /**
   * Set local user awareness (cursor position, selection)
   */
  public setLocalAwareness(cursor?: { line: number; column: number }, selection?: { start: { line: number; column: number }; end: { line: number; column: number } }): void {
    const userInfo = {
      user: { 
        name: `User ${this.userId.substring(0, 6)}`, 
        color: this.generateUserColor(this.userId),
        id: this.userId 
      },
      cursor,
      selection
    };

    this.awareness.set(this.userId, userInfo);
    
    // Broadcast awareness update if handler provided
    if (this.onAwarenessUpdate) {
      const awarenessUpdate = this.encodeAwarenessUpdate();
      this.onAwarenessUpdate(awarenessUpdate);
    }
  }

  /**
   * Apply remote awareness update
   */
  public applyRemoteAwareness(awarenessData: { userId: string; cursor?: { line: number; column: number }; selection?: { start: { line: number; column: number }; end: { line: number; column: number } } }): void {
    const userInfo = {
      user: { 
        name: `User ${awarenessData.userId.substring(0, 6)}`, 
        color: this.generateUserColor(awarenessData.userId),
        id: awarenessData.userId 
      },
      cursor: awarenessData.cursor,
      selection: awarenessData.selection
    };

    this.awareness.set(awarenessData.userId, userInfo);
    console.log(`Updated awareness for user: ${awarenessData.userId}`);
  }

  /**
   * Remove user awareness (when user leaves)
   */
  public removeUserAwareness(userId: string): void {
    this.awareness.delete(userId);
    console.log(`Removed awareness for user: ${userId}`);
  }

  /**
   * Get all user awareness data
   */
  public getAwareness(): Map<string, { 
    user: { name: string; color: string; id: string };
    cursor?: { line: number; column: number };
    selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
  }> {
    return this.awareness;
  }

  /**
   * Get awareness data for users other than the current user
   */
  public getRemoteAwareness(): Array<{ 
    user: { name: string; color: string; id: string };
    cursor?: { line: number; column: number };
    selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
  }> {
    return Array.from(this.awareness.entries())
      .filter(([userId]) => userId !== this.userId)
      .map(([, awareness]) => awareness);
  }

  /**
   * Generate a consistent color for a user based on their ID
   */
  private generateUserColor(userId: string): string {
    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Generate HSL color for better variety
    const hue = Math.abs(hash) % 360;
    const saturation = 70 + (Math.abs(hash) % 30); // 70-100%
    const lightness = 45 + (Math.abs(hash) % 20); // 45-65%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Encode awareness update (simplified version)
   */
  private encodeAwarenessUpdate(): Uint8Array {
    const awareness = this.awareness.get(this.userId);
    if (!awareness) return new Uint8Array();
    
    // In a real implementation, you'd use a proper encoding
    // For now, we'll use JSON and TextEncoder
    const data = JSON.stringify({
      userId: this.userId,
      cursor: awareness.cursor,
      selection: awareness.selection
    });
    
    return new TextEncoder().encode(data);
  }

  /**
   * Get current document content as plain text
   */
  public getTextContent(): string {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return this.text.toString();
  }

  /**
   * Set document content (useful for initial load)
   */
  public setTextContent(content: string): void {
    // Clear existing content and insert new content
    this.text.delete(0, this.text.length);
    this.text.insert(0, content);
  }

  /**
   * Dispose of the document and clean up
   */
  public dispose(): void {
    this.doc.destroy();
    this.awareness.clear();
    console.log(`YjsDocumentSync disposed for document: ${this.documentId}`);
  }
}