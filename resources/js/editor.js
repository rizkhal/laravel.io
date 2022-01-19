import getCaretCoordinates from 'textarea-caret';

// Handle the click event of the style buttons inside the editor.
window.handleClick = (style, element) => {
    const { styles } = editorConfig();
    const input = element.querySelectorAll('textarea')[0];

    // Get the start and end positions of the current selection.
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;

    // Find the style in the configuration.
    const styleFormat = styles[style];

    // Get any prefix and/or suffix characters from the selected style.
    const prefix = styleFormat.before ? styleFormat.before : '';
    const suffix = styleFormat.after ? styleFormat.after : '';

    // Insert the prefix at the relevant position.
    input.value = insertCharactersAtPosition(input.value, prefix, selectionStart);

    // Insert the suffix at the relevant position.
    input.value = insertCharactersAtPosition(input.value, suffix, selectionEnd + prefix.length);

    // Reselect the selection and focus the input.
    input.setSelectionRange(selectionStart + prefix.length, selectionEnd + prefix.length);
    input.focus();
};

// Insert provided characters at the desired place in a string.
const insertCharactersAtPosition = (string, character, position) => {
    return [string.slice(0, position), character, string.slice(position)].join('');
};

// Configuration object for the text editor.
window.editorConfig = (body) => {
    return {
        styles: {
            header: {
                before: '### ',
            },
            bold: {
                before: '**',
                after: '**',
            },
            italic: {
                before: '_',
                after: '_',
            },
            quote: {
                before: '> ',
            },
            code: {
                before: '`',
                after: '`',
            },
            link: {
                before: '[](',
                after: ')',
            },
            image: {
                before: '![](',
                after: ')',
            },
        },
        cursorTop: 0,
        cursorLeft: 0,
        body: body,
        mode: 'write',
        showMentions: false,
        search: '',

        // Gets the current cursor position.
        cursorPosition: function () {
            return this.$refs.editor.selectionEnd;
        },

        // Submits the form enclosing the editor.
        submit: function () {
            this.$refs.editor.closest('form').submit();
        },

        // Updates the position of the listbox by calculating the caret position and applying an offset.
        updateListboxPosition: function (element, position) {
            const coordinates = getCaretCoordinates(element, position);
            this.cursorTop = coordinates.top + 25 + 'px';
            this.cursorLeft = coordinates.left + 'px';
        },

        // Takes the user input, determines if a mention is active and initiates the search.
        updateUserSearch: function () {
            const mentions = this.extractMentions();

            if (!mentions) {
                return this.resetUserSearch();
            }

            const shouldSearch = mentions.some(({ mention, start, end }) => {
                if (this.isAtCursor(start, end)) {
                    this.updateListboxPosition(this.$refs.editor, start);
                    this.showMentions = true;
                    this.search = mention.slice(1);
                    this.$wire.getUsers(this.search);
                    return true;
                }

                return false;
            });

            if (!shouldSearch) {
                this.resetUserSearch();
            }
        },

        // Resets the user search parameters.
        resetUserSearch: function () {
            this.showMentions = false;
            this.search = '';
        },

        // Determines whether or not the user listbox should be rendered.
        showUserListbox: function () {
            return this.showMentions && this.$wire.users.length > 0;
        },

        // Takes the selected user from the listbox and populates the value in the correct place in the editor.
        selectUser: function (username) {
            const mentions = this.extractMentions();

            if (!mentions) {
                return;
            }

            mentions.forEach(({ start, end }) => {
                if (this.isAtCursor(start, end)) {
                    this.body =
                        this.body.substring(0, start) + '@' + username + this.body.substring(end) + ' ';
                    this.$refs.editor.focus();
                    this.resetUserSearch();
                }
            });
        },

        // Extracts all the mentions from the input along with their start and end position in the string.
        extractMentions: function () {
            const mentionRegex = /@[\w\d]*/g
            let mention;
            let mentions = [];
            while ((mention = mentionRegex.exec(this.body)) !== null) {
                mentions.push({
                    mention: mention[0],
                    start: mention.index,
                    end: mention.index + mention[0].length
                })
            }

            return mentions;
        },

        // Detects whether or not the provided start and end position overlap the current cursor position.
        isAtCursor: function (start, end) {
            return this.cursorPosition() >= start && this.cursorPosition() <= end
        }
    }
};

Livewire.on('previewRequested', () => {
    highlightCode(document.getElementById('editor-preview'));
});
