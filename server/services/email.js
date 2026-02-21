const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// URL du site en production
const SITE_URL = process.env.SITE_URL || 'https://www.laptiteperlouze.fr';
const ADMIN_PATH = process.env.ADMIN_PATH || '/backoffice-perlouze';

// Envoyer une notification de nouvelle commande
async function sendOrderNotification(order, items) {
  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_EMAIL) {
    console.log('Resend non configuré, email non envoyé');
    return;
  }

  try {
    const itemsList = items.map(item => {
      const imgHtml = item.product_image
        ? `<img src="${item.product_image}" alt="${item.product_name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; margin-right: 10px; vertical-align: middle;">`
        : '';
      const detailsHtml = item.product_details
        ? `<br><span style="font-size: 0.85em; color: #888;">${item.product_details}</span>`
        : '';
      const linkHtml = `<a href="${SITE_URL}/produit/${item.product_id}" style="color: #9b59b6; text-decoration: none; font-size: 0.85em;">Voir la fiche</a>`;
      return `<li style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; align-items: center;">
        ${imgHtml}
        <div>
          <strong>${item.product_name}</strong> x ${item.quantity} - ${Number(item.price || 0).toFixed(2)}€
          ${detailsHtml}
          <br>${linkHtml}
        </div>
      </li>`;
    }).join('');

    const adminUrl = `${SITE_URL}${ADMIN_PATH}/dashboard#commandes`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.FORWARD_EMAIL || 'gabnouge@gmail.com',
      subject: `🌸 Nouvelle commande #${order.id} - La p'tite perlouze`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f4c2c2 0%, #d4a5d4 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
            .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #d4a5d4; }
            .customer-info { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
            .items-list { list-style: none; padding: 0; }
            .items-list li { padding: 8px 0; border-bottom: 1px solid #eee; }
            .total { font-size: 1.3em; font-weight: bold; color: #d4a5d4; margin-top: 15px; }
            .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #f4c2c2 0%, #d4a5d4 100%); color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌸 Nouvelle commande reçue !</h1>
            </div>
            <div class="content">
              <div class="order-details">
                <h2>Commande #${order.id}</h2>
                <p><strong>Date :</strong> ${new Date(order.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>

              <div class="customer-info">
                <h3>Informations client</h3>
                <p><strong>Nom :</strong> ${order.customer_name}</p>
                <p><strong>Email :</strong> ${order.customer_email}</p>
                <p><strong>Téléphone :</strong> ${order.customer_phone || 'Non renseigné'}</p>
                <p><strong>Adresse :</strong><br>${order.customer_address ? order.customer_address.replace(/\n/g, '<br>') : 'Non renseignée'}</p>
              </div>

              <div class="order-details">
                <h3>Articles commandés</h3>
                <ul class="items-list">
                  ${itemsList}
                </ul>
                <p class="total">Total : ${Number(order.total || 0).toFixed(2)}€</p>
              </div>

              <div style="text-align: center;">
                <a href="${adminUrl}" style="display: inline-block; padding: 12px 24px; background: #9b59b6; color: #ffffff !important; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 600; font-size: 14px;">Voir dans l'admin</a>
              </div>
            </div>
            <div class="footer">
              <p>La p'tite perlouze - Bijoux artisanaux</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log('✅ Email de notification de commande envoyé');
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de commande:', error);
  }
}

// Envoyer une notification de nouveau message
async function sendContactNotification(contact) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Resend non configuré, email non envoyé');
    return;
  }

  const vendorEmail = process.env.FORWARD_EMAIL || 'gabnouge@gmail.com';
  if (!vendorEmail) {
    console.log('Email vendeur non configuré');
    return;
  }

  try {
    const adminUrl = `${SITE_URL}${ADMIN_PATH}/dashboard#contacts`;
    const messagePreview = contact.message.length > 200 
      ? contact.message.substring(0, 200) + '...' 
      : contact.message;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: vendorEmail,
      subject: `💬 Nouveau message de ${contact.name} - La p'tite perlouze`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f4c2c2 0%, #d4a5d4 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
            .message-box { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #d4a5d4; }
            .contact-info { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #f4c2c2 0%, #d4a5d4 100%); color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💬 Nouveau message de contact</h1>
            </div>
            <div class="content">
              <div class="contact-info">
                <h3>Expéditeur</h3>
                <p><strong>Nom :</strong> ${contact.name}</p>
                <p><strong>Email :</strong> <a href="mailto:${contact.email}">${contact.email}</a></p>
                <p><strong>Date :</strong> ${new Date(contact.created_at || Date.now()).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>

              <div class="message-box">
                <h3>Message</h3>
                <p>${messagePreview.replace(/\n/g, '<br>')}</p>
              </div>

              <div style="text-align: center;">
                <a href="${adminUrl}" style="display: inline-block; padding: 12px 24px; background: #9b59b6; color: #ffffff !important; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 600; font-size: 14px;">Voir dans l'admin</a>
              </div>
            </div>
            <div class="footer">
              <p>La p'tite perlouze - Bijoux artisanaux</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log('✅ Email de notification de message envoyé à', vendorEmail);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de contact:', error);
  }
}

// Envoyer un email au client selon le statut de la commande
async function sendCustomerOrderEmail(order, items, status) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Resend non configuré, email client non envoyé');
    return;
  }

  try {
    const itemsList = items.map(item => {
      const name = item.product_name || item.name;
      const imgHtml = item.product_image
        ? `<img src="${item.product_image}" alt="${name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; margin-right: 10px; vertical-align: middle;">`
        : '';
      const detailsHtml = item.product_details
        ? `<br><span style="font-size: 0.85em; color: #888;">${item.product_details}</span>`
        : '';
      const productLink = `<a href="${SITE_URL}/produit/${item.product_id}" style="color: #d4a5d4; text-decoration: none;">${name}</a>`;
      return `<li style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; align-items: center;">
        ${imgHtml}
        <div>
          <strong>${productLink}</strong> x ${item.quantity} - ${Number(item.price || 0).toFixed(2)}€
          ${detailsHtml}
        </div>
      </li>`;
    }).join('');

    let subject, title, message, emoji;

    switch (status) {
      case 'pending':
        emoji = '⏳';
        title = 'Commande reçue';
        subject = `Commande #${order.id} reçue - La p'tite perlouze`;
        message = `
          <p>Merci pour votre commande ! Nous l'avons bien reçue et elle sera bientôt prise en charge.</p>
          <p>Vous recevrez un email dès que votre commande sera confirmée.</p>
        `;
        break;

      case 'confirmed':
        emoji = '✅';
        title = 'Commande confirmée';
        subject = `Commande #${order.id} confirmée - La p'tite perlouze`;
        message = `
          <p>Bonne nouvelle ! Votre commande a été confirmée et nous commençons à préparer vos bijoux avec soin.</p>
          <p>Vous recevrez un email dès que votre commande sera expédiée.</p>
        `;
        break;

      case 'shipped':
        emoji = '📦';
        title = 'Commande expédiée';
        subject = `Commande #${order.id} expédiée - La p'tite perlouze`;
        message = `
          <p>Votre commande a été expédiée ! Elle devrait arriver dans les prochains jours.</p>
          <p>Merci pour votre confiance et à bientôt ! ✨</p>
        `;
        break;

      case 'delivered':
        emoji = '🎉';
        title = 'Commande livrée';
        subject = `Commande #${order.id} livrée - Merci ! 💜`;
        message = `
          <p>Votre commande a été marquée comme livrée !</p>
          <p>Nous espérons que tout est arrivé en parfait état et que vos bijoux vous plaisent. 💜</p>
          <p>Un grand merci pour votre confiance. Si vous avez un moment, n'hésitez pas à nous laisser un petit avis, ça nous fait toujours très plaisir !</p>
          <p>À très bientôt pour de nouvelles créations ✨</p>
        `;
        break;

      default:
        return;
    }

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: order.customer_email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f4c2c2 0%, #d4a5d4 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .emoji { font-size: 3em; margin-bottom: 10px; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
            .message-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #d4a5d4; }
            .items-list { list-style: none; padding: 0; margin: 10px 0; }
            .items-list li { padding: 8px 0; border-bottom: 1px solid #eee; }
            .total { font-size: 1.2em; font-weight: bold; color: #d4a5d4; margin-top: 15px; padding-top: 15px; border-top: 2px solid #d4a5d4; }
            .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 0.9em; background: #f5f5f5; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">${emoji}</div>
              <h1>${title}</h1>
              <p>Commande #${order.id}</p>
            </div>
            <div class="content">
              <div class="message-box">
                <p>Bonjour ${order.customer_name},</p>
                ${message}
              </div>

              <div class="order-details">
                <h3>Récapitulatif de votre commande</h3>
                <ul class="items-list">
                  ${itemsList}
                </ul>
                <p class="total">Total : ${Number(order.total || 0).toFixed(2)}€</p>
              </div>

              <div class="message-box">
                <p style="margin: 0;"><strong>Adresse de livraison :</strong></p>
                <p style="margin-top: 5px;">${order.customer_address ? order.customer_address.replace(/\n/g, '<br>') : 'Non renseignée'}</p>
              </div>
            </div>
            <div class="footer">
              <p><strong>La p'tite perlouze</strong></p>
              <p>Bijoux artisanaux avec amour ✨</p>
              <p style="margin-top: 10px; font-size: 0.85em;">
                Une question ? Répondez simplement à cet email !
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log(`✅ Email client envoyé (${status}) pour commande #${order.id}`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email client:', error);
  }
}

// Notifier le vendeur d'une nouvelle réponse email du client
async function sendNewEmailNotification({ from, subject, message, threadId }) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Resend non configuré, notification non envoyée');
    return;
  }

  const vendorEmail = process.env.FORWARD_EMAIL || 'gabnouge@gmail.com';
  if (!vendorEmail) {
    console.log('Email vendeur non configuré');
    return;
  }

  try {
    const adminUrl = `${SITE_URL}${ADMIN_PATH}/dashboard#contacts`;
    const messagePreview = message && message.length > 300 
      ? message.substring(0, 300) + '...' 
      : (message || '[Pas de contenu texte]');

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: vendorEmail,
      subject: `📩 Nouvelle réponse de ${from} - La p'tite perlouze`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f4c2c2 0%, #d4a5d4 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
            .message-box { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #d4a5d4; }
            .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #f4c2c2 0%, #d4a5d4 100%); color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📩 Nouvelle réponse client</h1>
            </div>
            <div class="content">
              <div class="info-box">
                <p><strong>De :</strong> ${from}</p>
                <p><strong>Objet :</strong> ${subject || '(sans objet)'}</p>
                ${threadId ? `<p><strong>Thread :</strong> #${threadId}</p>` : ''}
              </div>

              <div class="message-box">
                <h3>Aperçu du message</h3>
                <p>${messagePreview.replace(/\n/g, '<br>')}</p>
              </div>

              <div style="text-align: center;">
                <a href="${adminUrl}" style="display: inline-block; padding: 12px 24px; background: #9b59b6; color: #ffffff !important; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 600; font-size: 14px;">Répondre dans l'admin</a>
              </div>
            </div>
            <div class="footer">
              <p>La p'tite perlouze - Bijoux artisanaux</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log('✅ Notification nouvelle réponse email envoyée à', vendorEmail);
  } catch (error) {
    console.error('❌ Erreur notification email:', error);
  }
}

// Forward un email entrant vers une adresse externe
async function forwardEmail({ emailId, from, subject, text, html, attachments }) {
  // Adresse de forwarding (à configurer via variable d'environnement)
  const forwardTo = process.env.FORWARD_EMAIL || 'gabnouge@gmail.com';
  
  if (!process.env.RESEND_API_KEY) {
    console.log('Resend non configuré, forwarding non effectué');
    return;
  }

  try {
    // Préparer les pièces jointes pour Resend
    const resendAttachments = attachments?.map(att => ({
      filename: att.filename,
      content: att.content // déjà en base64
    })) || [];

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: forwardTo,
      subject: `[FWD] ${subject || 'Sans sujet'}`,
      html: `
        <div style="background: #f5f5f5; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
          <p><strong>📧 Email transféré automatiquement</strong></p>
          <p><strong>De :</strong> ${from}</p>
          <p><strong>Sujet original :</strong> ${subject || 'Sans sujet'}</p>
        </div>
        <hr style="margin: 20px 0;">
        ${html || `<pre>${text || '[Pas de contenu]'}</pre>`}
      `,
      text: `[Email transféré de ${from}]\n\nSujet: ${subject}\n\n${text || '[Pas de contenu texte]'}`,
      attachments: resendAttachments
    });

    console.log('📤 Email transféré vers', forwardTo);
    return result;
  } catch (error) {
    console.error('❌ Erreur forwarding email:', error);
  }
}

module.exports = {
  sendOrderNotification,
  sendContactNotification,
  sendCustomerOrderEmail,
  sendNewEmailNotification,
  forwardEmail
};
