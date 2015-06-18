/*
---
description:
  - MultiSelect is a MooTools plugin that turns your checkbox set into one single multi-select dropdown menu. MultiSelect is also completely CSS skinnable.

authors:
  - Blaž Maležič (http://twitter.com/blazmalezic)
  - Chris Page (http://www.starforge.co.uk)

version:
  - 1.3.1

license:
  - MIT-style license

requires:
  core/1.2.1:   '*'

provides:
  - MultiSelect
...
*/
var MultiSelect = new Class({

    Implements: [Options,Events],

    options: {
        boxes: 'input[type=checkbox]',  // checkbox selector
        labels: 'label',                // label selector
        monitorText: ' selected',       // monitor text (localization)
        containerClass: 'MultiSelect',  // element container CSS class
        monitorClass: 'monitor',        // monitor CSS class
        monitorActiveClass: 'active',   // monitor open CSS class
        itemSelectedClass: 'selected',  // list item selected CSS class
        itemHoverClass: 'hover',        // list item hover CSS class - usually we would use CSS :hover pseudo class, but we need this for keyboard navigation functionality
        maxMonitorText: 16,             // How long, in characters, should the monitor text be
        emptyText: "Select options...", // String used when no options are set
        maxHeight: undefined,           // How tall can the multiselect box be? undef = use css default
        form: undefined,                // Which form is this attached to?
        phpnames: false                 // If true, [] is added to hidden input names.
        /* Events:
        onItemChanged:  Fired whenever a checkbox in the list is changed
        onListOpen:     Fired after the list is opened
        onListClose:    Fired after the list is closed (regardless of whether any changes have happened)
        */
    },

    initialize: function(selector, options) {
        // set options
        this.setOptions(options);

        // Ensure the form is a usable element.
        if(this.options.form !== undefined)
            this.options.form = $(this.options.form)

        // set global action variables
        this.active = false;
        this.action = 'open';
        this.state = 'closed';

        // get elements array
        this.elements = document.getElements(selector);

        // off we go...
        this.elements.each(function(element) {
            this.buildMenu(element);
        }, this);
    },

    buildMenu: function(element) {
        // create closure
        var self = this;

        // add container class (for styling)
        element.addClass(self.options.containerClass);

        // create item instances
        var boxes = element.getElements(self.options.boxes);
        var labels = element.getElements(self.options.labels);

        var ulstyles = { display: 'none' };
        if(self.options.maxHeight) {
            ulstyles['max-height'] = self.options.maxHeight;
        }

        // list container
        self.list = new Element('ul', {
            'styles': ulstyles,
            'class': 'MultiSelectList',
            'events': {
                'mouseenter': function() { self.action = 'open'; },
                'mouseleave': function() {
                    self.action = 'close';
                    self.itemHover('none');
                },

                'mousedown': function(e) { e.stop(); }, // stop text selection
                'selectstart': function() { return false; }, // stop IE text selection

                'keydown': function(e) {
                    if (e.key == 'esc') {
                        self.closeMenu();
                    }
                    else if (e.key == 'down' || e.key == 'up') {
                        self.itemHover(e.key);
                    }
                }
            }
        });

        // list monitor
        self.monitor = new Element('div', {
            'class': self.options.monitorClass,
            'html': '<div><div>' + self.changeMonitorValue() + '</div></div>',
            'tabindex': 0,
            'events': {
                'mouseenter': function() { self.action = 'open'; },
                'mouseleave': function() { self.action = 'close'; },
                'click': function() {

                    if (this.hasClass(self.options.monitorActiveClass)) {
                        self.closeMenu();
                    }
                    else {
                        self.openMenu();
                    }
                },
                'keydown': function(e) {
                    if (e.key == 'space' || e.key == 'down' || e.key == 'up') {
                        self.action = 'close';
                        self.openMenu();
                    }
                },

                'mousedown': function(e) { e.stop(); }, // stop text selection
                'selectstart': function() { return false; } // stop IE text selection
            }
        });

        // list items
        boxes.each(function(box, i) {
            box.addEvents({
                'click': function(e) {
                    e.stop();
                },
                'keydown': function(e) {
                    if (e.key == 'space') {
                        self.active = true;
                        self.changeItemState(this.getParent(), this);
                    }
                    if (self.active && (e.key == 'down' || e.key == 'up')) {
                        self.changeItemState(this.getParent(), this);
                    }
                },
                'keyup': function(e) {
                    if (e.key == 'space') {
                        self.active = false;
                    }
                }
            });
            var label = labels[i];
            new Element('li', {
                'class': box.get('checked') ? self.options.itemSelectedClass : '',
                'events': {
                    'mouseenter': function() {
                        if (self.active === true) {
                            self.changeItemState(this, box);
                        }
                        self.itemHover(this);
                    },
                    'mousedown': function() {
                        self.active = true;
                        self.changeItemState(this, box);
                    }
                }
            }).adopt([box, label]).inject(self.list);

            // If a form has been set, we need to include hidden values...
            if(self.options.form) {
                var name = box.get('name');

                // Handle php weirdness.
                if(self.options.phpnames && name.substr(-2) !== "[]") name += "[]";

                new Element('input', {
                    'type': 'hidden',
                    'id': 'form-' + box.get('id'),
                    'name': name,
                    'value':  box.get('checked') ? box.get('value') : '',
                }).inject(self.options.form);
            }
        });

        // 'global' events
        document.addEvents({
            'mouseup': function() { self.active = false; },
            'click': function() {
                if (self.action == 'close') {
                    self.closeMenu();
                }
            },
            'keydown': function(e) {
                if (e.key == 'esc') {
                    self.closeMenu();
                    self.itemHover('none');
                }
                if (self.state == 'opened' && (e.key == 'down' || e.key == 'up')) {
                    e.stop();
                }
            }
        });

        // replace element content
        element.empty().adopt(self.monitor);
        document.body.adopt(self.list);
        self.update();
    },

    append: function(selector) {
        var elements = document.getElements(selector);
        this.elements.combine(elements);

        elements.each(function(element) {
            this.buildMenu(element);
        }, this);
    },

    changeItemState: function(item, checkbox) {
        if (item.hasClass(this.options.itemSelectedClass)) {
            item.removeClass(this.options.itemSelectedClass);
            checkbox.set('checked', false).focus();
        }
        else {
            item.addClass(this.options.itemSelectedClass);
            checkbox.set('checked', true).focus();
        }

        this.update();
        this.fireEvent('itemChanged', checkbox);
    },

    changeMonitorValue: function() {
        var elems = this.list.getElements(this.options.boxes).filter(function(box) {
            return box.get('checked');
        });

        if(elems.length) {
            var sel_list = new Array();
            elems.each(function(item) {
                var label = item.getParent().getElement('label');
                if(label) {
                    sel_list.push(label.get('html'));
                }
            });

            var text = sel_list.join(', ');

            if(this.options.maxMonitorText && (text.length > this.options.maxMonitorText)) {
                text = text.substr(0, this.options.maxMonitorText - 3) + "...";
            }

            return text;
        } else {
            return this.options.emptyText;
        }
    },

    itemHover: function(select) {
        var current = this.list.getElement('li.'+this.options.itemHoverClass);

        switch (select) {
            case 'down':
                if (current && (sibling = current.getNext())) current.removeClass(this.options.itemHoverClass);
                else this.itemHover('last');
                break;
             case 'up':
                if (current && (sibling = current.getPrevious())) current.removeClass(this.options.itemHoverClass);
                else this.itemHover('first');
                break;
            case 'none':
                this.list.getElements('li.'+this.options.itemHoverClass).removeClass(this.options.itemHoverClass);
                break;
            case 'first':
                var sibling = this.list.getFirst();
                break;
            case 'last':
                var sibling = this.list.getLast();
                break;
            default:
                if (current) current.removeClass(this.options.itemHoverClass);
                var sibling = select;
                break;
        }

        if (sibling)
            sibling.addClass(this.options.itemHoverClass).getElement(this.options.boxes).focus();
    },

    openMenu: function() {
        this.monitor.addClass(this.options.monitorActiveClass);

        // The menu needs to be positioned, and to do that we need the location
        // and size of the monitor box...
        var position = this.monitor.getPosition();
        var size     = this.monitor.getSize();

        this.list.setStyles({'display': 'block',
                             'position': 'absolute',
                             'left': position.x,
                             'top': position.y + size.y,
                             'width': size.x});
        this.itemHover('first');

        this.state = 'opened';

        this.fireEvent('listOpen', this.monitor.getParent());

        var height = this.list.getStyle('max-height').toInt() ? this.list.getStyle('max-height').toInt() : this.list.getStyle('height').toInt();
        if(this.list.getScrollSize().y > height)
            this.list.setStyle('overflow-y', 'scroll');
    },

    closeMenu: function() {
        this.monitor.removeClass(this.options.monitorActiveClass);
        this.list.setStyle('display', 'none');

        if(this.options.form) {
            this.list.getElements('input').each(function(elem) {
                var value = elem.checked ? elem.get('value') : '';
                $('form-' + elem.get('id')).set('value', value);
            });
        }

        this.action = 'open';
        this.state = 'closed';

        this.fireEvent('listClose', this.monitor.getParent());
    },

    update: function() {
        this.monitor.set('html', '<div><div>' + this.changeMonitorValue() + '</div></div>');
    }
});