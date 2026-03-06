from flask import Blueprint, render_template, request, redirect, url_for, flash
from app import db
from app.models import Cliente

clientes_bp = Blueprint('clientes', __name__)


@clientes_bp.route('/')
def listar():
    q = request.args.get('q', '').strip()
    query = Cliente.query
    if q:
        query = query.filter(
            Cliente.nome.ilike(f'%{q}%') | Cliente.cpf_cnpj.ilike(f'%{q}%')
        )
    clientes = query.order_by(Cliente.nome).all()
    return render_template('clientes/listar.html', clientes=clientes, q=q)


@clientes_bp.route('/novo', methods=['GET', 'POST'])
def novo():
    if request.method == 'POST':
        nome = request.form.get('nome', '').strip()
        cpf_cnpj = request.form.get('cpf_cnpj', '').strip()
        telefone = request.form.get('telefone', '').strip()
        email = request.form.get('email', '').strip()
        endereco = request.form.get('endereco', '').strip()

        if not nome or not cpf_cnpj or not telefone:
            flash('Nome, CPF/CNPJ e Telefone são obrigatórios.', 'danger')
            return render_template('clientes/form.html', cliente=None)

        if Cliente.query.filter_by(cpf_cnpj=cpf_cnpj).first():
            flash('CPF/CNPJ já cadastrado.', 'danger')
            return render_template('clientes/form.html', cliente=None)

        cliente = Cliente(
            nome=nome,
            cpf_cnpj=cpf_cnpj,
            telefone=telefone,
            email=email,
            endereco=endereco,
        )
        db.session.add(cliente)
        db.session.commit()
        flash('Cliente cadastrado com sucesso!', 'success')
        return redirect(url_for('clientes.listar'))

    return render_template('clientes/form.html', cliente=None)


@clientes_bp.route('/<int:id>/editar', methods=['GET', 'POST'])
def editar(id):
    cliente = Cliente.query.get_or_404(id)
    if request.method == 'POST':
        nome = request.form.get('nome', '').strip()
        cpf_cnpj = request.form.get('cpf_cnpj', '').strip()
        telefone = request.form.get('telefone', '').strip()
        email = request.form.get('email', '').strip()
        endereco = request.form.get('endereco', '').strip()

        if not nome or not cpf_cnpj or not telefone:
            flash('Nome, CPF/CNPJ e Telefone são obrigatórios.', 'danger')
            return render_template('clientes/form.html', cliente=cliente)

        existing = Cliente.query.filter_by(cpf_cnpj=cpf_cnpj).first()
        if existing and existing.id != id:
            flash('CPF/CNPJ já cadastrado para outro cliente.', 'danger')
            return render_template('clientes/form.html', cliente=cliente)

        cliente.nome = nome
        cliente.cpf_cnpj = cpf_cnpj
        cliente.telefone = telefone
        cliente.email = email
        cliente.endereco = endereco
        db.session.commit()
        flash('Cliente atualizado com sucesso!', 'success')
        return redirect(url_for('clientes.listar'))

    return render_template('clientes/form.html', cliente=cliente)


@clientes_bp.route('/<int:id>')
def detalhar(id):
    cliente = Cliente.query.get_or_404(id)
    return render_template('clientes/detalhar.html', cliente=cliente)


@clientes_bp.route('/<int:id>/excluir', methods=['POST'])
def excluir(id):
    cliente = Cliente.query.get_or_404(id)
    db.session.delete(cliente)
    db.session.commit()
    flash('Cliente excluído com sucesso!', 'success')
    return redirect(url_for('clientes.listar'))
