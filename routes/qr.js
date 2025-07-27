const express = require('express');
const QRCode = require('qrcode');
const Event = require('../models/Event');
const { 
  authenticateToken,
  requireEventOwnership,
  validateEventAccess 
} = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Generate QR code for an event
router.post('/generate/:eventId', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const event = req.event;
  const { 
    format = 'png', 
    size = 256, 
    errorCorrectionLevel = 'M',
    margin = 4,
    color = '#000000',
    background = '#FFFFFF'
  } = req.body;

  // Generate the event URL
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const eventUrl = `${baseUrl}/event/${event._id}`;

  try {
    // QR Code options
    const options = {
      errorCorrectionLevel,
      type: format === 'svg' ? 'svg' : 'image/png',
      quality: 0.92,
      margin,
      color: {
        dark: color,
        light: background
      },
      width: parseInt(size)
    };

    let qrCodeData;
    
    if (format === 'svg') {
      qrCodeData = await QRCode.toString(eventUrl, { ...options, type: 'svg' });
    } else {
      qrCodeData = await QRCode.toDataURL(eventUrl, options);
    }

    // Update event with QR code data
    await Event.findByIdAndUpdate(event._id, {
      'qrCode.data': eventUrl,
      'qrCode.imageUrl': format === 'svg' ? null : qrCodeData
    });

    res.json({
      success: true,
      message: 'QR code generated successfully',
      data: {
        qrCode: qrCodeData,
        eventUrl,
        format,
        size: parseInt(size)
      }
    });

  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code'
    });
  }
}));

// Get QR code for an event
router.get('/:eventId', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const event = req.event;
  const { 
    format = 'png', 
    size = 256, 
    download = false,
    errorCorrectionLevel = 'M',
    margin = 4,
    color = '#000000',
    background = '#FFFFFF'
  } = req.query;

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const eventUrl = `${baseUrl}/event/${event._id}`;

  try {
    const options = {
      errorCorrectionLevel,
      type: format === 'svg' ? 'svg' : 'image/png',
      quality: 0.92,
      margin: parseInt(margin),
      color: {
        dark: color,
        light: background
      },
      width: parseInt(size)
    };

    if (download === 'true') {
      // Generate QR code for download
      if (format === 'svg') {
        const svgString = await QRCode.toString(eventUrl, { ...options, type: 'svg' });
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', `attachment; filename="event-qr-${event._id}.svg"`);
        res.send(svgString);
      } else {
        const pngBuffer = await QRCode.toBuffer(eventUrl, { ...options, type: 'png' });
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="event-qr-${event._id}.png"`);
        res.send(pngBuffer);
      }
    } else {
      // Return QR code data
      let qrCodeData;
      
      if (format === 'svg') {
        qrCodeData = await QRCode.toString(eventUrl, { ...options, type: 'svg' });
      } else {
        qrCodeData = await QRCode.toDataURL(eventUrl, options);
      }

      res.json({
        success: true,
        data: {
          qrCode: qrCodeData,
          eventUrl,
          format,
          size: parseInt(size)
        }
      });
    }

  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code'
    });
  }
}));

// Get QR code with custom styling
router.post('/:eventId/styled', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const event = req.event;
  const {
    format = 'png',
    size = 256,
    errorCorrectionLevel = 'M',
    margin = 4,
    style = 'square', // square, round, dots
    logo = null, // Base64 logo to embed
    color = '#000000',
    background = '#FFFFFF',
    gradient = null // { type: 'linear', colors: ['#color1', '#color2'], direction: 'diagonal' }
  } = req.body;

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const eventUrl = `${baseUrl}/event/${event._id}`;

  try {
    let options = {
      errorCorrectionLevel,
      type: format === 'svg' ? 'svg' : 'image/png',
      quality: 0.92,
      margin: parseInt(margin),
      width: parseInt(size)
    };

    // Apply styling options
    if (gradient) {
      // For gradient, we'll use a basic implementation
      options.color = {
        dark: gradient.colors[0] || color,
        light: background
      };
    } else {
      options.color = {
        dark: color,
        light: background
      };
    }

    let qrCodeData;
    
    if (format === 'svg') {
      qrCodeData = await QRCode.toString(eventUrl, { ...options, type: 'svg' });
    } else {
      qrCodeData = await QRCode.toDataURL(eventUrl, options);
    }

    res.json({
      success: true,
      data: {
        qrCode: qrCodeData,
        eventUrl,
        format,
        size: parseInt(size),
        style
      }
    });

  } catch (error) {
    console.error('Styled QR code generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate styled QR code'
    });
  }
}));

// Bulk generate QR codes for multiple events
router.post('/bulk-generate', authenticateToken, asyncHandler(async (req, res) => {
  const { eventIds, format = 'png', size = 256 } = req.body;

  if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Event IDs array is required'
    });
  }

  // Check if user has access to all events
  const events = await Event.find({
    _id: { $in: eventIds },
    $or: [
      { host: req.user._id },
      { photographers: req.user._id }
    ]
  });

  if (events.length !== eventIds.length) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to some events'
    });
  }

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const results = [];

  try {
    for (const event of events) {
      const eventUrl = `${baseUrl}/event/${event._id}`;
      
      const options = {
        errorCorrectionLevel: 'M',
        type: format === 'svg' ? 'svg' : 'image/png',
        quality: 0.92,
        margin: 4,
        color: {
          dark: event.theme?.colorScheme?.primary || '#000000',
          light: '#FFFFFF'
        },
        width: parseInt(size)
      };

      let qrCodeData;
      
      if (format === 'svg') {
        qrCodeData = await QRCode.toString(eventUrl, { ...options, type: 'svg' });
      } else {
        qrCodeData = await QRCode.toDataURL(eventUrl, options);
      }

      // Update event with QR code data
      await Event.findByIdAndUpdate(event._id, {
        'qrCode.data': eventUrl,
        'qrCode.imageUrl': format === 'svg' ? null : qrCodeData
      });

      results.push({
        eventId: event._id,
        eventTitle: event.title,
        coupleNames: event.coupleNames,
        qrCode: qrCodeData,
        eventUrl
      });
    }

    res.json({
      success: true,
      message: `QR codes generated for ${results.length} events`,
      data: { qrCodes: results }
    });

  } catch (error) {
    console.error('Bulk QR code generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR codes'
    });
  }
}));

// Validate QR code (check if event exists and is accessible)
router.get('/validate/:eventId', validateEventAccess, asyncHandler(async (req, res) => {
  const event = req.event;

  res.json({
    success: true,
    message: 'QR code is valid',
    data: {
      event: {
        _id: event._id,
        title: event.title,
        coupleNames: event.coupleNames,
        eventDate: event.eventDate,
        venue: event.venue,
        isActive: event.isActive,
        isPublished: event.isPublished,
        requiresPassword: event.privacy.isPasswordProtected
      }
    }
  });
}));

// Get QR code analytics
router.get('/:eventId/analytics', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const { timeframe = '7d' } = req.query;
  const event = req.event;

  // This would typically integrate with analytics service
  // For now, we'll return mock data structure
  const analytics = {
    totalScans: 0,
    uniqueScans: 0,
    scansByDate: [],
    scansByDevice: {
      mobile: 0,
      desktop: 0,
      tablet: 0
    },
    scansByLocation: [],
    topReferrers: []
  };

  res.json({
    success: true,
    data: { analytics }
  });
}));

// Generate printable QR code sheet
router.get('/:eventId/printable', authenticateToken, requireEventOwnership, asyncHandler(async (req, res) => {
  const event = req.event;
  const { 
    copies = 1, 
    includeText = true, 
    includeInstructions = true,
    paperSize = 'A4'
  } = req.query;

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const eventUrl = `${baseUrl}/event/${event._id}`;

  try {
    // Generate QR code
    const qrCodeData = await QRCode.toDataURL(eventUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 4,
      width: 512,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Create printable HTML
    const printableHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>QR Code - ${event.title}</title>
        <style>
          @page { 
            size: ${paperSize}; 
            margin: 2cm; 
          }
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            margin: 0; 
            padding: 0;
          }
          .qr-container { 
            margin: 2cm auto; 
            page-break-inside: avoid; 
          }
          .qr-code { 
            max-width: 200px; 
            height: auto; 
          }
          .event-title { 
            font-size: 24px; 
            font-weight: bold; 
            margin: 20px 0 10px 0; 
          }
          .couple-names { 
            font-size: 18px; 
            margin: 10px 0; 
          }
          .instructions { 
            font-size: 14px; 
            margin: 20px 0; 
            max-width: 400px; 
            margin-left: auto; 
            margin-right: auto; 
          }
          .url { 
            font-size: 12px; 
            word-break: break-all; 
            margin: 10px 0; 
          }
        </style>
      </head>
      <body>
        ${Array.from({ length: parseInt(copies) }, (_, i) => `
          <div class="qr-container">
            <img src="${qrCodeData}" alt="QR Code" class="qr-code" />
            ${includeText === 'true' ? `
              <div class="event-title">${event.title}</div>
              <div class="couple-names">${event.coupleNames.partner1} & ${event.coupleNames.partner2}</div>
            ` : ''}
            ${includeInstructions === 'true' ? `
              <div class="instructions">
                Scan this QR code with your phone's camera to access our wedding photo gallery and share your memories!
              </div>
            ` : ''}
            <div class="url">${eventUrl}</div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="qr-code-${event._id}.html"`);
    res.send(printableHtml);

  } catch (error) {
    console.error('Printable QR code generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate printable QR code'
    });
  }
}));

module.exports = router;