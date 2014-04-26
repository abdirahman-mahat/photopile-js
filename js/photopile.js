//
// File: photopile.js
// Auth: Brian W. Howell
// Date: 25 April 2014

//
// PHOTOPILE
// 
//
var photopile = (function() {

    //---------------------------------------------------------------------------------------------
    //  PHOTOPILE SETTINGS
    //---------------------------------------------------------------------------------------------

    // Thumbnails
    var thumbOverlap      = 50;         // overlap amount (px)
    var thumbRotation     = 45;         // maximum rotation (deg)
    var thumbBorderWidth  = 2;          // border width (px)
    var thumbBorderColor  = 'white';    // border color
    var thumbBorderHover  = '#6DB8FF';  // border hover color
    var numLayers         = 5;          // number of layers in the pile (max zindex)

    // Photo container
    var photoZIndex       = 100;        // z-index (show above all)
    var photoBorder       = 10;         // border width around fullsize image
    var photoBorderColor  = 'white';    // border color
    var fadeDuration      = 200;        // speed at which photo fades (ms)
    var pickupDuration    = 500;        // speed at which photo is picked up & put down (ms)

    // Background images
    var thumbLoading   = 'images/thumb-loading.gif';    // path to image displayed while thumbnail loads
    var galleryLoading = 'images/gallery-loading.gif';  // path to image displayed while gallery loads
    var nextPhoto      = 'images/next.png';             // navigator next photo arrow
    var prevPhoto      = 'images/prev.png';             // navigator previous photo arrow

    //---- END SETTINGS ----

    // Initializes Photopile
    function init() {

        // display gallery loading image on container div
        $('.js div.photopile-wrapper').css({
            'background-repeat'   : 'no-repeat',
            'background-position' : '50%, 50%',
            'background-image'    : 'url(' + galleryLoading + ')'
        });

        // initialize thumbnails and photo container
        $('ul.photopile').children().each( function() { 
            thumb.init($(this));
        });
        photo.init();

        // once gallery has loaded completely
        $(window).load(function() {
            $('.js div.photopile-wrapper').css({  // style container
                'padding' : thumbOverlap + 'px',
                'background-image' : 'none'
            }).children().css({  // display thumbnails
                'opacity' : '0',
                'display' : 'inline-block'
            }).fadeTo(fadeDuration, 1);
            navigator.init();  // init navigator
        });
    
    } // init

    //-----------------------------------------------------
    // THUMBNAIL
    // List-item containing a link to a a fullsize image
    //-----------------------------------------------------

    var thumb = {

        active : 'photopile-active-thumbnail',  // active (or clicked) thumbnail class name

        // Initializes thumbnail.
        init : function( thumb ) {
            thumb.children().css( 'padding', thumbBorderWidth + 'px' );
            this.bindUIActions(thumb);
            this.setRotation(thumb);
            this.setOverlap(thumb);
            this.setZ(thumb);
            thumb.css('background', thumbBorderColor );
        },

        // Binds UI actions to thumbnail.
        bindUIActions : function( thumb ) {
            var self = this;
       
            // Mouseover | Move to top of pile and change border color.
            thumb.mouseover( function() { 
                $(this).css({
                    'z-index'    : numLayers + 1,
                    'background' : thumbBorderHover 
                });
            });

            // Mouseout | Move down one layer and return to default border color.
            thumb.mouseout( function() { 
                $(this).css({
                    'z-index'    : numLayers,
                    'background' : thumbBorderColor
                });
            });

            // On click | Open image in the photo container.
            thumb.click( function(e) {
                e.preventDefault();
                if ($(this).hasClass(self.active)) return;
                photo.pickup( $(this) );
            });

        }, // bindUIActions

        // Sets thumbnail overlap amount.
        setOverlap : function( thumb ) {
            thumb.css( 'margin', ((thumbOverlap * -1) / 2) + 'px' );
        },

        // Sets thumbnail z-index to random layer.
        setZ : function( thumb ) {
            thumb.css({ 'z-index' : Math.floor((Math.random() * numLayers) + 1) });
        },

        // Sets thumbnail rotation randomly.
        setRotation : function( thumb ) {
            var min = -1 * thumbRotation;
            var max = thumbRotation;
            var randomRotation = Math.floor( Math.random() * (max - min + 1)) + min;
            thumb.css({ 'transform' : 'rotate(' + randomRotation + 'deg)' });
        },

        // ----- Active thumbnail -----

        // Gets the active thumbnail if set, or returns false.
        getActive : function() { 
            return ($('li.' + this.active)[0]) ? $('li.' + this.active).first() : false;
        },

        // Sets the active thumbnail.
        setActive : function( thumb ) { thumb.addClass(this.active); },

        // Return active thumbnail properties
        getActiveOffset   : function() { return $('li.' + this.active).offset(); },
        getActiveHeight   : function() { return $('li.' + this.active).height(); },
        getActiveWidth    : function() { return $('li.' + this.active).width(); },
        getActiveImgSrc   : function() { return $('li.' + this.active).children().first().attr('href'); },
        getActiveRotation : function() {
                var transform = $('li.' + this.active).css("transform");
                var values = transform.split('(')[1].split(')')[0].split(',');
                var angle = Math.round( Math.asin( values[1]) * (180/Math.PI) );
                return angle;
        },

        // Returns a shift amount used to better position the photo container 
        // on top of the active thumb. Needed because offset is skewed by thumbnail's rotation.
        getActiveShift : function() {
            return ( this.getActiveRotation() < 0 )
                ? -( this.getActiveRotation(thumb) * 0.40 )
                :  ( this.getActiveRotation(thumb) * 0.40 );
        },

        // Removes the active class from all thumbnails.
        clearActiveClass : function() { $('li.' + this.active).fadeTo(fadeDuration, 1).removeClass(this.active); }

    } // thumbnail
 
    //--------------------------------------------------------------------
    // PHOTO CONTAINER
    // Dynamic container div wrapping an img element that displays the 
    // fullsize image associated with the active thumbnail
    //--------------------------------------------------------------------

    var photo = {

        // Photo container elements
        container : $( '<div id="photopile-active-image-container"/>' ), 
        image     : $( '<img id="photopile-active-image" />'),

        isPickedUp     : false,  // track if photo container is currently viewable
        fullSizeWidth  : null,   // will hold width of active thumbnail's fullsize image
        fullSizeHeight : null,   // will hold height of active thumbnail's fullsize image
        windowPadding  : 20,     // minimum space between container and edge of window (px)
        
        // Initializes the photo container.
        // Adds elements to DOM and saves container selectors.
        init : function() {

            $('body').append( this.container );
            this.container.css({
                'display'    : 'none',
                'position'   : 'absolute',
                'padding'    : thumbBorderWidth,
                'z-index'    : photoZIndex,
                'background' : photoBorderColor,
                'background-image'    : 'url(' + thumbLoading + ')',
                'background-repeat'   : 'no-repeat',
                'background-position' : '50%, 50%'
            });

            this.container.append( this.image );
            this.image.css('display', 'block');
            this.container = $('div#photopile-active-image-container');
            this.image = this.container.children();
        
        }, // init

        // Simulates picking up a photo from the photopile.
        pickup : function( thumbnail ) {
            var self = this;
            if ( self.isPickedUp ) {
                // photo already picked up. put it down and then pickup the clicked thumbnail
                self.putDown( function() { self.pickup( thumbnail ); });
            } else {
                self.isPickedUp = true;
                thumb.clearActiveClass();
                thumb.setActive( thumbnail );
                self.loadImage( thumb.getActiveImgSrc(), function() {
                    self.image.fadeTo(fadeDuration, '1');
                    self.enlarge();
                    $('body').bind('click', function() { self.putDown(); });
                });
            }
        }, // pickup

        // Simulates putting a photo down, or returning to the photo pile.
        putDown : function( callback ) {
            self = this;
            $('body').unbind();
            self.container.stop().animate({
                'top'     : thumb.getActiveOffset().top + thumb.getActiveShift(),
                'left'    : thumb.getActiveOffset().left + thumb.getActiveShift(),
                'width'   : thumb.getActiveWidth() + 'px',
                'height'  : thumb.getActiveHeight() + 'px',
                'padding' : thumbBorderWidth + 'px'
            }, pickupDuration, function() {
                self.isPickedUp = false;
                thumb.clearActiveClass();
                self.container.fadeOut( fadeDuration, function() {
                    if (callback) callback();
                });
            });
        },

        // Handles the loading of an image when a thumbnail is clicked.
        loadImage : function ( src, callback ) {
            var self = this;
            self.image.css('opacity', '0');         // Image is not visible until
            self.startPosition();                   // the container is positioned,
            var img = new Image;                    // the source is updated,
            img.src = src;                          // and the image is loaded.
            img.onload = function() {               // Restore visibility in callback
                self.fullSizeWidth = this.width;
                self.fullSizeHeight = this.height;
                self.setImageSource( src );
                if (callback) callback();
            };
        },

        // Positions the container over the active thumb and brings it into view.
        startPosition : function() {
            this.container.css({
                'top'       : thumb.getActiveOffset().top + thumb.getActiveShift(),
                'left'      : thumb.getActiveOffset().left + thumb.getActiveShift(),
                'transform' : 'rotate(' + thumb.getActiveRotation() + 'deg)',
                'width'     : thumb.getActiveWidth() + 'px',
                'height'    : thumb.getActiveHeight() + 'px',
                'padding'   : thumbBorderWidth
            }).fadeTo(fadeDuration, '1');
            thumb.getActive().fadeTo(fadeDuration, '0');
        },

        // Enlarges the photo container based on window and image size (loadImage callback).
        enlarge : function() {
            var windowHeight = window.innerHeight ? window.innerHeight : $(window).height(); // mobile safari hack
            var availableWidth = $(window).width() - (2 * this.windowPadding);
            var availableHeight = windowHeight - (2 * this.windowPadding);
            if ((availableWidth < this.fullSizeWidth) && ( availableHeight < this.fullSizeHeight )) {
                // determine which dimension will allow image to fit completely within the window
                if ((availableWidth * (this.fullSizeHeight / this.fullSizeWidth)) > availableHeight) {
                    this.enlargeToWindowHeight( availableHeight );
                } else {
                    this.enlargeToWindowWidth( availableWidth );
                }
            } else if ( availableWidth < this.fullSizeWidth ) {
                this.enlargeToWindowWidth( availableWidth );
            } else if ( availableHeight < this.fullSizeHeight ) {
                this.enlargeToWindowHeight( availableHeight );
            } else {
                this.enlargeToFullSize();
            }
        }, // enlarge

        // Fullsize image will fit in window.
        enlargeToFullSize : function() {
            this.container.css('transform', 'rotate(0deg)').animate({
                'top'     : ($(window).scrollTop()) + ($(window).height() / 2) - (this.fullSizeHeight / 2),
                'left'    : ($(window).scrollLeft()) + ($(window).width() / 2) - (this.fullSizeWidth / 2),
                'width'   : (this.fullSizeWidth - (2 * photoBorder)) + 'px',
                'height'  : (this.fullSizeHeight - (2 * photoBorder)) + 'px',
                'padding' : photoBorder + 'px',
            });
        },

        // Fullsize image width exceeds window width.
        enlargeToWindowWidth : function( availableWidth ) {
            var adjustedHeight = availableWidth * (this.fullSizeHeight / this.fullSizeWidth);
            this.container.css('transform', 'rotate(0deg)').animate({
                'top'     : $(window).scrollTop()  + ($(window).height() / 2) - (adjustedHeight / 2),
                'left'    : $(window).scrollLeft() + ($(window).width() / 2)  - (availableWidth / 2),
                'width'   : availableWidth + 'px',
                'height'  : adjustedHeight + 'px',
                'padding' : photoBorder + 'px'
            });
        },

        // Fullsize image height exceeds window height.
        enlargeToWindowHeight : function( availableHeight ) {
            var adjustedWidth = availableHeight * (this.fullSizeWidth / this.fullSizeHeight);
            this.container.css('transform', 'rotate(0deg)').animate({
                'top'     : $(window).scrollTop()  + ($(window).height() / 2) - (availableHeight / 2),
                'left'    : $(window).scrollLeft() + ($(window).width() / 2)  - (adjustedWidth / 2),
                'width'   : adjustedWidth + 'px',
                'height'  : availableHeight + 'px',
                'padding' : photoBorder + 'px'
            });
        },

        // Sets the photo container's image source.
        setImageSource : function( src ) { 
            this.image.attr('src', src).css({
                'width'      : '100%',
                'height'     : '100%',
                'margin-top' : '0' 
            });
        }

    } // photo

    // #########################################################################################
    // NAVIGATOR UNDER DEVELOPMENT
    // Currently working on next/prev functionality. In particular next/prev divs in the 
    // container. THIS IS NOT COMPLETE...
    // Arrows currently appear on hover, this probably won't work for touch screens. Might 
    // minimize the arrow size and maintain visibility.
    // #########################################################################################

    var navigator = {

        // Navigator elements
        next : $( '<div id="photopile-nav-next" />' ), 
        prev : $( '<div id="photopile-nav-prev" />' ),

        // Initializes the navigator.
        init : function() {
            this.addElements();
            this.bindUIActions();
        },

        // Adds required navigator elements, classes, and styles.
        addElements : function() {

            // add 'first/last' class to respective thumbnail element in the gallery
            $('ul.photopile li:first').addClass('first');
            $('ul.photopile li:last').addClass('last');

            // add navigator elements to the photo container
            photo.container.append( this.next );
            photo.container.append( this.prev );

            // apply css styles ########## (probably going to move this to photopile.css) ###########
            this.next.css({
                'position' : 'absolute',
                'top' : '0',
                'right' : '0',
                'width' : '25%',
                'height' : '100%'
            });
            this.prev.css({
                'position' : 'absolute',
                'top' : '0',
                'left' : '0',
                'width' : '15%',
                'height' : '100%'
            });

        }, // addElements

        // Binds UI actions to navigator elements.
        bindUIActions : function() {

            this.next.click( function(e) {
                e.preventDefault();
                navigator.pickupNext();
            });

            this.prev.click( function(e) {
                e.preventDefault();
                navigator.pickupPrev();
            });

            this.next.mouseover( function() { 
                $(this).css({
                    // ########## some of this can be moved to photopile.css ##########
                    'background-image'    : 'url(' + nextPhoto + ')',
                    'background-repeat'   : 'no-repeat',
                    'background-position' : '100%, 50%',
                    //'background-size' : '200px 200px'
                });
            });
            this.next.mouseout( function() { 
                $(this).css({ 'background-image' : 'none' });
            });
            this.prev.mouseover( function() { 
                $(this).css({
                    'background-image'    : 'url(' + prevPhoto + ')',
                    'background-repeat'   : 'no-repeat',
                    'background-position' : '0, 50%'
                });
            });
            this.prev.mouseout( function() { 
                $(this).css({ 'background-image' : 'none'  });
            });

            // bind prev & next to LR arrow respectively
            $(document.documentElement).keyup(function (e) {
                if (e.keyCode == 39) { navigator.pickupNext(); } // right arrow clicks
                if (e.keyCode == 37) { navigator.pickupPrev(); } // left arrow clicks
            });
        },

        // Picks up the next photo in gallery.
        pickupNext : function() {
            var activeThumb = thumb.getActive();
            if ( !activeThumb ) return;
            if ( activeThumb.hasClass('last')) {
                photo.pickup( $('ul.photopile').children().first() );  // pickup first 
            } else {
                photo.pickup( activeThumb.next('li') ); // pickup next
            }
        },

        // Picks up the previous photo in gallery.
        pickupPrev : function() {
            var activeThumb = thumb.getActive();
            if ( !activeThumb ) return;
            if ( activeThumb.hasClass('first')) {
                photo.pickup( $('ul.photopile').children().last() );  // pickup last 
            } else {
                photo.pickup( activeThumb.prev('li') ); // pickup prev
            }
        }

    }; // navigator

    // Return 1 method Photopile API
    return { scatter : init }

})(); // photopile

photopile.scatter();  // ### initialize the photopile ###
