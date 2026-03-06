from flask import Blueprint, render_template, request, redirect, url_for, flash
from app import db
from app.models import Veiculo, Cliente

veiculos_bp = Blueprint('veiculos', __name__)


@veiculos_bp.route('/')
def listar():
    q = request.args.get('q', '').strip()
    query = Veiculo.query
    if q:
        query = query.filter(
            Veiculo.placa.ilike(f'%{q}%') |
            Veiculo.modelo.ilike(f'%{q}%') |
            Veiculo.marca.ilike(f'%{q}%')
        )
    veiculos = query.order_by(Veiculo.placa).all()
    return render_template('veiculos/listar.html', veiculos=veiculos, q=q)


@veiculos_bp.route('/novo', methods=['GET', 'POST'])
def novo():
    clientes = Cliente.query.order_by(Cliente.nome).all()
    if request.method == 'POST':
        cliente_id = request.form.get('cliente_id', type=int)
        marca = request.form.get('marca', '').strip()
        modelo = request.form.get('modelo', '').strip()
        ano = request.form.get('ano', type=int)
        placa = request.form.get('placa', '').strip().upper()
        cor = request.form.get('cor', '').strip()
        chassi = request.form.get('chassi', '').strip()

        if not cliente_id or not marca or not modelo or not ano or not placa:
            flash('Cliente, Marca, Modelo, Ano e Placa são obrigatórios.', 'danger')
            return render_template('veiculos/form.html', veiculo=None, clientes=clientes)

        if Veiculo.query.filter_by(placa=placa).first():
            flash('Placa já cadastrada.', 'danger')
            return render_template('veiculos/form.html', veiculo=None, clientes=clientes)

        veiculo = Veiculo(
            cliente_id=cliente_id,
            marca=marca,
            modelo=modelo,
            ano=ano,
            placa=placa,
            cor=cor,
            chassi=chassi,
        )
        db.session.add(veiculo)
        db.session.commit()
        flash('Veículo cadastrado com sucesso!', 'success')
        return redirect(url_for('veiculos.listar'))

    return render_template('veiculos/form.html', veiculo=None, clientes=clientes)


@veiculos_bp.route('/<int:id>/editar', methods=['GET', 'POST'])
def editar(id):
    veiculo = Veiculo.query.get_or_404(id)
    clientes = Cliente.query.order_by(Cliente.nome).all()
    if request.method == 'POST':
        cliente_id = request.form.get('cliente_id', type=int)
        marca = request.form.get('marca', '').strip()
        modelo = request.form.get('modelo', '').strip()
        ano = request.form.get('ano', type=int)
        placa = request.form.get('placa', '').strip().upper()
        cor = request.form.get('cor', '').strip()
        chassi = request.form.get('chassi', '').strip()

        if not cliente_id or not marca or not modelo or not ano or not placa:
            flash('Cliente, Marca, Modelo, Ano e Placa são obrigatórios.', 'danger')
            return render_template('veiculos/form.html', veiculo=veiculo, clientes=clientes)

        existing = Veiculo.query.filter_by(placa=placa).first()
        if existing and existing.id != id:
            flash('Placa já cadastrada para outro veículo.', 'danger')
            return render_template('veiculos/form.html', veiculo=veiculo, clientes=clientes)

        veiculo.cliente_id = cliente_id
        veiculo.marca = marca
        veiculo.modelo = modelo
        veiculo.ano = ano
        veiculo.placa = placa
        veiculo.cor = cor
        veiculo.chassi = chassi
        db.session.commit()
        flash('Veículo atualizado com sucesso!', 'success')
        return redirect(url_for('veiculos.listar'))

    return render_template('veiculos/form.html', veiculo=veiculo, clientes=clientes)


@veiculos_bp.route('/<int:id>')
def detalhar(id):
    veiculo = Veiculo.query.get_or_404(id)
    return render_template('veiculos/detalhar.html', veiculo=veiculo)


@veiculos_bp.route('/<int:id>/excluir', methods=['POST'])
def excluir(id):
    veiculo = Veiculo.query.get_or_404(id)
    db.session.delete(veiculo)
    db.session.commit()
    flash('Veículo excluído com sucesso!', 'success')
    return redirect(url_for('veiculos.listar'))
