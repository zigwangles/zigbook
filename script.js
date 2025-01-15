class BookWritingApp {
    constructor() {
        this.chapters = [];
        this.characters = [];
        this.relationships = [];
        this.timelineEvents = [];
        this.researchNotes = [];
        this.dictionary = null;
        this.initializeDictionary();
        this.initializeElements();
        this.setupEventListeners();
        this.commandHistory = [];
        this.commandIndex = -1;
    }

    async initializeDictionary() {
        const response = await fetch('https://raw.githubusercontent.com/hello-world-example/typo-js/master/typo/dictionaries/en_US/en_US.dic');
        const words = await response.text();
        this.dictionary = new Typo("en_US", false, false, { dictionaryData: words });
    }

    initializeElements() {
        this.commandInput = document.getElementById('commandInput');
        this.outputArea = document.getElementById('outputArea');
        this.editor = document.getElementById('editor');
        this.editorArea = document.getElementById('editorArea');
        this.timelineView = document.getElementById('timelineView');
        this.relationshipMap = document.getElementById('relationshipMap');
        this.canvas = document.getElementById('relationshipCanvas');
        this.ctx = this.canvas.getContext('2d');
    }

    setupEventListeners() {
        this.commandInput.addEventListener('keydown', (e) => this.handleCommand(e));
        this.editor.addEventListener('input', () => this.handleEditorInput());
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Auto-save every 30 seconds
        setInterval(() => this.saveWork(), 30000);
    }

    handleCommand(e) {
        if (e.key === 'Enter') {
            const command = this.commandInput.value.trim();
            this.executeCommand(command);
            this.commandHistory.push(command);
            this.commandIndex = this.commandHistory.length;
            this.commandInput.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.commandIndex > 0) {
                this.commandIndex--;
                this.commandInput.value = this.commandHistory[this.commandIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.commandIndex < this.commandHistory.length - 1) {
                this.commandIndex++;
                this.commandInput.value = this.commandHistory[this.commandIndex];
            }
        }
    }

    executeCommand(command) {
        const [cmd, ...args] = command.split(' ');
        
        const commands = {
            'help': () => this.showHelp(),
            'chapter': () => this.handleChapterCommand(args),
            'edit': () => this.showEditor(),
            'timeline': () => this.handleTimelineCommand(args),
            'character': () => this.handleCharacterCommand(args),
            'relationship': () => this.handleRelationshipCommand(args),
            'research': () => this.handleResearchCommand(args),
            'export': () => this.exportBook(args[0]),
            'clear': () => this.clearScreen(),
            'save': () => this.saveWork(),
            'spellcheck': () => this.spellcheckCurrent(),
        };

        if (commands[cmd]) {
            commands[cmd]();
        } else {
            this.print(`Unknown command: ${cmd}. Type 'help' for available commands.`);
        }
    }

    showHelp() {
        const help = `
Available commands:
  help                    - Show this help message
  chapter list           - List all chapters
  chapter add <title>    - Add a new chapter
  chapter delete <id>    - Delete a chapter
  edit                   - Open the editor
  timeline add <event>   - Add timeline event
  timeline show          - Show timeline
  character add <name>   - Add character
  character list         - List characters
  relationship add       - Add character relationship
  relationship show      - Show relationship map
  research add <note>    - Add research note
  research list          - List research notes
  export epub            - Export book as EPUB
  clear                  - Clear screen
  save                   - Save work
  spellcheck            - Check spelling in current chapter
        `;
        this.print(help);
    }

    handleChapterCommand(args) {
        const [action, ...params] = args;
        
        switch (action) {
            case 'add':
                const title = params.join(' ');
                this.chapters.push({
                    id: this.chapters.length + 1,
                    title,
                    content: ''
                });
                this.print(`Created chapter: ${title}`);
                break;
            
            case 'list':
                const chapterList = this.chapters
                    .map(ch => `${ch.id}. ${ch.title}`)
                    .join('\n');
                this.print(chapterList || 'No chapters yet');
                break;
            
            case 'delete':
                const id = parseInt(params[0]);
                this.chapters = this.chapters.filter(ch => ch.id !== id);
                this.print(`Deleted chapter ${id}`);
                break;
        }
    }

    handleTimelineCommand(args) {
        const [action, ...params] = args;
        
        switch (action) {
            case 'add':
                const event = params.join(' ');
                this.timelineEvents.push({
                    id: this.timelineEvents.length + 1,
                    event,
                    date: new Date()
                });
                this.print(`Added timeline event: ${event}`);
                break;
            
            case 'show':
                this.showTimeline();
                break;
        }
    }

    showTimeline() {
        this.hideAllViews();
        this.timelineView.classList.remove('hidden');
        
        const container = document.getElementById('timelineContainer');
        container.innerHTML = this.timelineEvents
            .map(event => `
                <div class="timeline-event">
                    <div class="event-date">${event.date.toLocaleDateString()}</div>
                    <div class="event-text">${event.event}</div>
                </div>
            `).join('');
    }

    async exportBook(format) {
        if (format === 'epub') {
            const zip = new JSZip();

            // Add mimetype file
            zip.file('mimetype', 'application/epub+zip');

            // Add META-INF directory
            const metaInf = zip.folder('META-INF');
            metaInf.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
                <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
                    <rootfiles>
                        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
                    </rootfiles>
                </container>`);

            // Add content
            const oebps = zip.folder('OEBPS');
            
            // Add each chapter
            this.chapters.forEach((chapter, index) => {
                oebps.file(`chapter${index + 1}.xhtml`, `<?xml version="1.0" encoding="UTF-8"?>
                    <!DOCTYPE html>
                    <html xmlns="http://www.w3.org/1999/xhtml">
                    <head>
                        <title>${chapter.title}</title>
                    </head>
                    <body>
                        <h1>${chapter.title}</h1>
                        ${chapter.content.split('\n').map(p => `<p>${p}</p>`).join('')}
                    </body>
                    </html>`);
            });

            // Add content.opf
            const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
                <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookID">
                    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
                        <dc:title>My Book</dc:title>
                        <dc:creator>Author</dc:creator>
                        <dc:language>en</dc:language>
                        <dc:identifier id="BookID">urn:uuid:${this.generateUUID()}</dc:identifier>
                    </metadata>
                    <manifest>
                        ${this.chapters.map((_, index) => 
                            `<item id="chapter${index + 1}" href="chapter${index + 1}.xhtml" media-type="application/xhtml+xml"/>`
                        ).join('\n')}
                    </manifest>
                    <spine>
                        ${this.chapters.map((_, index) => 
                            `<itemref idref="chapter${index + 1}"/>`
                        ).join('\n')}
                    </spine>
                </package>`;

            oebps.file('content.opf', contentOpf);

            // Generate epub file
            const content = await zip.generateAsync({type: 'blob'});
            const url = window.URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'book.epub';
            a.click();
            window.URL.revokeObjectURL(url);
            this.print('Book exported as EPUB successfully!');
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    handleCharacterCommand(args) {
        const [action, ...params] = args;
        
        switch (action) {
            case 'add':
                const name = params.join(' ');
                this.characters.push({
                    id: this.characters.length + 1,
                    name,
                    traits: [],
                    notes: ''
                });
                this.print(`Added character: ${name}`);
                break;
            
            case 'list':
                const charList = this.characters
                    .map(char => `${char.id}. ${char.name}`)
                    .join('\n');
                this.print(charList || 'No characters yet');
                break;
            
            case 'delete':
                const id = parseInt(params[0]);
                this.characters = this.characters.filter(char => char.id !== id);
                this.print(`Deleted character ${id}`);
                break;
        }
    }

    handleRelationshipCommand(args) {
        const [action] = args;
        
        switch (action) {
            case 'add':
                document.getElementById('relationshipModal').classList.remove('hidden');
                this.populateCharacterSelects();
                break;
            
            case 'show':
                this.showRelationshipMap();
                break;
        }
    }

    populateCharacterSelects() {
        const options = this.characters
            .map(char => `<option value="${char.id}">${char.name}</option>`)
            .join('');
        
        document.getElementById('char1Select').innerHTML = options;
        document.getElementById('char2Select').innerHTML = options;
    }

    addRelationship() {
        const char1 = document.getElementById('char1Select').value;
        const char2 = document.getElementById('char2Select').value;
        const type = document.getElementById('relationshipType').value;
        
        this.relationships.push({
            char1: parseInt(char1),
            char2: parseInt(char2),
            type
        });
        
        document.getElementById('relationshipModal').classList.add('hidden');
        this.showRelationshipMap();
    }

    showRelationshipMap() {
        this.hideAllViews();
        this.relationshipMap.classList.remove('hidden');
        this.resizeCanvas();
        this.drawRelationshipMap();
    }

    resizeCanvas() {
        this.canvas.width = this.relationshipMap.clientWidth;
        this.canvas.height = 400;
    }

    drawRelationshipMap() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw characters as nodes
        const positions = {};
        const radius = 20;
        const padding = 50;
        
        this.characters.forEach((char, index) => {
            const x = padding + (this.canvas.width - 2 * padding) * 
                (index / (this.characters.length - 1 || 1));
            const y = this.canvas.height / 2;
            
            positions[char.id] = {x, y};
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = '#33ff33';
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.fillText(char.name, x, y + radius + 15);
        });
        
        // Draw relationships as lines
        this.relationships.forEach(rel => {
            const start = positions[rel.char1];
            const end = positions[rel.char2];
            
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.strokeStyle = this.getRelationshipColor(rel.type);
            ctx.stroke();
            
            // Draw relationship type
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            ctx.fillStyle = '#33ff33';
            ctx.fillText(rel.type, midX, midY - 10);
        });
    }

    getRelationshipColor(type) {
        const colors = {
            friend: '#00ff00',
            enemy: '#ff0000',
            family: '#0000ff',
            romantic: '#ff00ff'
        };
        return colors[type] || '#ffffff';
    }

    handleResearchCommand(args) {
        const [action, ...params] = args;
        
        switch (action) {
            case 'add':
                const note = params.join(' ');
                this.researchNotes.push({
                    id: this.researchNotes.length + 1,
                    note,
                    date: new Date()
                });
                this.print(`Added research note: ${note}`);
                break;
            
            case 'list':
                const notesList = this.researchNotes
                    .map(note => `${note.id}. [${note.date.toLocaleDateString()}] ${note.note}`)
                    .join('\n');
                this.print(notesList || 'No research notes yet');
                break;
        }
    }

    spellcheckCurrent() {
        if (!this.dictionary) {
            this.print('Dictionary not yet loaded. Please try again in a moment.');
            return;
        }

        const words = this.editor.value.split(/\s+/);
        const misspelled = words.filter(word => 
            word.length > 0 && !this.dictionary.check(word));
        
        if (misspelled.length > 0) {
            this.print('Misspelled words:\n' + misspelled.join('\n'));
        } else {
            this.print('No spelling errors found!');
        }
    }

    handleEditorInput() {
        const wordCount = this.editor.value.trim().split(/\s+/).filter(Boolean).length;
        document.getElementById('wordCount').textContent = `Words: ${wordCount}`;
        document.getElementById('saveStatus').textContent = 'Unsaved';
    }

    saveWork() {
        localStorage.setItem('bookData', JSON.stringify({
            chapters: this.chapters,
            characters: this.characters,
            relationships: this.relationships,
            timelineEvents: this.timelineEvents,
            researchNotes: this.researchNotes
        }));
        document.getElementById('saveStatus').textContent = 'Saved';
        this.print('Work saved successfully!');
    }

    loadWork() {
        const data = localStorage.getItem('bookData');
        if (data) {
            const parsed = JSON.parse(data);
            this.chapters = parsed.chapters || [];
            this.characters = parsed.characters || [];
            this.relationships = parsed.relationships || [];
            this.timelineEvents = parsed.timelineEvents || [];
            this.researchNotes = parsed.researchNotes || [];
            this.print('Work loaded successfully!');
        }
    }

    hideAllViews() {
        this.editorArea.classList.add('hidden');
        this.timelineView.classList.add('hidden');
        this.relationshipMap.classList.add('hidden');
    }

    showEditor() {
        this.hideAllViews();
        this.editorArea.classList.remove('hidden');
    }

    print(message) {
        this.outputArea.innerHTML += `\n> ${message}`;
        this.outputArea.scrollTop = this.outputArea.scrollHeight;
    }

    clearScreen() {
        this.outputArea.innerHTML = '';
    }
}

// Initialize the app
const bookApp = new BookWritingApp();
bookApp.loadWork();